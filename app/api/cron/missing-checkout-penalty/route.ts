import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findHolidayForDate } from "@/lib/holidayAttendance";
import { isOvernightShift, resolvePlainShiftTimes } from "@/lib/shiftResolve";

/**
 * Chạy 00:30 VN mỗi ngày (xem vercel.json "30 17 * * *" UTC), quét AttendanceLog: có checkInAt
 * nhưng vẫn checkOutAt = null quá 1 ngày → coi là "quên chấm công ra", ghi status="missing_checkout"
 * + trừ tiền phạt CỐ ĐỊNH (Company.missingCheckoutPenaltyAmount, 0 = công ty chưa bật, sếp phải tự
 * vào Cài đặt bật). User phản ánh 14/9/2026: báo cáo vẫn hiện "Đúng giờ" dù giờ ra bỏ trống, không
 * ai biết NV rời lúc nào — yêu cầu phạt nặng hơn cả trễ giờ/về sớm, xem lib/attendance.ts
 * resolveFullDayStatus.
 *
 * QUÉT NGƯỢC TỐI ĐA LOOKBACK_DAYS ngày (không chỉ đúng "hôm qua") — phát hiện 14/9/2026: bản đầu
 * chỉ lọc `date: targetDate` (đúng 1 ngày) nên nếu công ty MỚI bật tính năng (missingCheckoutPenaltyAmount
 * từ 0 → >0) hoặc cron lỡ 1 đêm không chạy được, mọi log "quên chấm công ra" từ TRƯỚC đó vĩnh viễn
 * không bao giờ bị bắt (mỗi đêm chỉ nhìn đúng 1 ngày của đêm đó). Quét lùi + lọc theo status vẫn
 * != "missing_checkout" nên vẫn idempotent — log nào đã xử lý rồi sẽ tự rớt khỏi candidates ở lượt sau.
 *
 * Chờ đến hết ngày (không xử lý "hôm nay") để không phạt oan ca đêm/ca gãy còn đang làm dở qua nửa
 * đêm. User xác nhận 14/9/2026 công ty CÓ ca đêm/ca qua đêm (vd 22:00–06:00) → thêm OVERNIGHT_GRACE_HOURS
 * bên dưới: log của NV cấu hình ca qua đêm (isOvernightShift) chưa đủ OVERNIGHT_GRACE_HOURS kể từ
 * checkInAt thì BỎ QUA ở lượt chạy này (không đánh dấu missing_checkout), để lượt quét check-out
 * thật (đã fix ở checkin/checkin-face/checkin-qr/checkin-remote — xem lib/shiftResolve.ts
 * isOvernightShift) hoặc lượt cron đêm sau có cơ hội đóng đúng log trước.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Hôm qua" giờ VN = ngày mới nhất được coi là đã kết thúc (khỏi phạt "hôm nay" — chưa hết ngày).
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnNow = new Date(Date.now() + VN_OFFSET_MS);
  const targetDate = new Date(vnNow.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  // Giới hạn quét ngược — tránh mỗi lần chạy phải quét toàn bộ lịch sử NV cũ/nghỉ việc còn log dở dang.
  const LOOKBACK_DAYS = 45;
  const earliestDate = new Date(vnNow.getTime() - (LOOKBACK_DAYS + 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const companies = await prisma.company.findMany({
    where: { missingCheckoutPenaltyAmount: { gt: 0 } },
    select: { id: true, missingCheckoutPenaltyAmount: true },
  });

  // Ca qua đêm còn dưới ngần này giờ kể từ lúc check-in → có thể vẫn đang làm dở, chưa phạt vội.
  const OVERNIGHT_GRACE_HOURS = 20;
  const now = Date.now();

  let penalized = 0;
  const details: Array<{ companyId: string; count: number }> = [];

  for (const company of companies) {
    const candidates = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: earliestDate, lte: targetDate },
        checkInAt: { not: null },
        checkOutAt: null,
        status: { not: "missing_checkout" },
        employee: { companyId: company.id },
      },
      select: {
        id: true, employeeId: true, date: true, checkInAt: true,
        employee: { select: { shiftOverride: true, branch: { select: { checkInTime: true, checkOutTime: true } } } },
      },
    });
    if (candidates.length === 0) continue;

    // Tra ngày lễ theo TỪNG ngày có mặt trong candidates (có thể trải nhiều ngày do quét ngược) —
    // cache lại tránh tra trùng ngày.
    const holidayByDate = new Map<string, Awaited<ReturnType<typeof findHolidayForDate>>>();
    for (const d of Array.from(new Set(candidates.map((l) => l.date)))) {
      holidayByDate.set(d, await findHolidayForDate(company.id, d));
    }

    // Bỏ qua: (1) ngày lễ không phạt trễ, (2) NV cấu hình ca qua đêm chưa đủ OVERNIGHT_GRACE_HOURS
    // kể từ lúc check-in — tránh phạt oan người vẫn đang làm dở ca (xem comment đầu file).
    const logs = candidates.filter((l) => {
      if (!l.checkInAt) return false;
      const holiday = holidayByDate.get(l.date);
      if (holiday && !holiday.penalizeLate) return false;
      const times = resolvePlainShiftTimes(
        l.employee.shiftOverride,
        l.employee.branch.checkInTime,
        l.employee.branch.checkOutTime
      );
      if (isOvernightShift(times.checkInTime, times.checkOutTime)) {
        const elapsedHours = (now - l.checkInAt.getTime()) / (60 * 60 * 1000);
        if (elapsedHours < OVERNIGHT_GRACE_HOURS) return false;
      }
      return true;
    });
    if (logs.length === 0) continue;

    const amount = company.missingCheckoutPenaltyAmount;

    // Gộp tiền phạt theo (nhân viên, năm, tháng) — quét ngược có thể trải nhiều tháng nên không còn
    // dùng chung 1 year/month cho cả lượt chạy như bản trước.
    const byEmployeeMonth = new Map<string, { employeeId: string; year: number; month: number; total: number }>();
    for (const l of logs) {
      const [yearStr, monthStr] = l.date.split("-");
      const key = `${l.employeeId}:${yearStr}:${monthStr}`;
      const entry = byEmployeeMonth.get(key) ?? {
        employeeId: l.employeeId, year: Number(yearStr), month: Number(monthStr), total: 0,
      };
      entry.total += amount;
      byEmployeeMonth.set(key, entry);
    }

    await prisma.$transaction([
      ...logs.map((l) =>
        prisma.attendanceLog.update({
          where: { id: l.id },
          data: {
            status: "missing_checkout",
            missingCheckoutPenalty: amount,
            penaltyAmount: { increment: amount },
          },
        })
      ),
      ...Array.from(byEmployeeMonth.values()).map((v) =>
        prisma.monthlySummary.upsert({
          where: { employeeId_year_month: { employeeId: v.employeeId, year: v.year, month: v.month } },
          create: { employeeId: v.employeeId, year: v.year, month: v.month, totalPenalty: v.total },
          update: { totalPenalty: { increment: v.total } },
        })
      ),
    ]);

    penalized += logs.length;
    details.push({ companyId: company.id, count: logs.length });
  }

  return NextResponse.json({ ok: true, targetDate, penalized, details });
}
