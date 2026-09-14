import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findHolidayForDate } from "@/lib/holidayAttendance";
import { isOvernightShift, resolveLogShiftTimes, vnDateTimeToInstant } from "@/lib/shiftResolve";

/**
 * Quét AttendanceLog: có checkInAt nhưng vẫn checkOutAt = null → coi là "quên chấm công ra", ghi
 * status="missing_checkout" + trừ tiền phạt CỐ ĐỊNH (Company.missingCheckoutPenaltyAmount, 0 = công
 * ty chưa bật, sếp phải tự vào Cài đặt bật). User phản ánh 14/9/2026: báo cáo vẫn hiện "Đúng giờ" dù
 * giờ ra bỏ trống, không ai biết NV rời lúc nào — yêu cầu phạt nặng hơn cả trễ giờ/về sớm, xem
 * lib/attendance.ts resolveFullDayStatus.
 *
 * TÍNH THEO GIỜ RA DỰ KIẾN CỦA TỪNG DÒNG (không đợi hết ngày lịch VN) — user phản ánh thêm cùng
 * ngày 14/9/2026, sau khi đã tự bật tính năng: chờ tới cron đêm (00:30 VN hôm sau) là quá chậm, yêu
 * cầu áp phạt trong vòng ~1-3 tiếng SAU GIỜ RA CA của từng người ("Sau khi kết thúc giờ làm của bạn
 * ... khoảng 2-3 tiếng, không thấy động đậy gì ... hãy áp dụng mức phạt này"). Nên đổi hẳn cách tính
 * mốc: không còn "ngày lịch VN đã qua chưa", mà tính thẳng GIỜ RA DỰ KIẾN của từng dòng (biết cả ca
 * gãy nhiều buổi, "ngày làm khác", ca qua đêm — xem resolveLogShiftTimes) + GRACE_HOURS bên dưới.
 * Cách này cũng tự nhiên thay luôn cơ chế OVERNIGHT_GRACE_HOURS cũ (chờ đủ giờ kể từ lúc check-in):
 * ca qua đêm giờ tính mốc = giờ ra dự kiến (đã cộng thêm 1 ngày) + GRACE_HOURS, chính xác hơn hẳn.
 *
 * Route này giờ cần được gọi THƯỜNG XUYÊN (mỗi giờ) để bắt kịp mốc trên — nhưng gói Vercel Hobby chỉ
 * cho cron chạy tối đa 1 lần/ngày (xem vercel.json, vẫn giữ nguyên lịch 00:30 VN cũ làm lưới an toàn
 * dự phòng), nên lịch chạy hàng giờ THẬT SỰ nằm ở .github/workflows/missing-checkout-penalty.yml
 * (GitHub Actions, cùng cách late-reminder.yml đã né giới hạn Hobby).
 *
 * QUÉT NGƯỢC TỐI ĐA LOOKBACK_DAYS ngày (không chỉ "hôm nay") — phát hiện 14/9/2026: bản đầu chỉ lọc
 * đúng 1 ngày nên nếu công ty MỚI bật tính năng hoặc cron lỡ 1 lượt không chạy được, log "quên chấm
 * công ra" từ TRƯỚC đó vĩnh viễn không bao giờ bị bắt. Quét lùi + lọc theo status vẫn != "missing_checkout"
 * nên vẫn idempotent — log nào đã xử lý rồi sẽ tự rớt khỏi candidates ở lượt sau.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();
  const vnNow = new Date(now.getTime() + VN_OFFSET_MS);
  // Bao gồm CẢ hôm nay (không chỉ "hôm qua") — ca ngày có thể đã quá giờ ra + GRACE_HOURS ngay trong hôm nay.
  const todayDate = vnNow.toISOString().slice(0, 10);
  // Giới hạn quét ngược — tránh mỗi lần chạy phải quét toàn bộ lịch sử NV cũ/nghỉ việc còn log dở dang.
  const LOOKBACK_DAYS = 45;
  const earliestDate = new Date(vnNow.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const companies = await prisma.company.findMany({
    where: { missingCheckoutPenaltyAmount: { gt: 0 } },
    select: { id: true, missingCheckoutPenaltyAmount: true },
  });

  // User yêu cầu 14/9/2026: "1-2 tiếng ... khoảng 2-3 tiếng" sau giờ ra ca mà vẫn im lặng thì áp phạt
  // — chọn mốc giữa 2 khoảng đó.
  const GRACE_HOURS = 2;

  let penalized = 0;
  const details: Array<{ companyId: string; count: number }> = [];

  for (const company of companies) {
    const candidates = await prisma.attendanceLog.findMany({
      where: {
        date: { gte: earliestDate, lte: todayDate },
        checkInAt: { not: null },
        checkOutAt: null,
        status: { not: "missing_checkout" },
        employee: { companyId: company.id },
      },
      select: {
        id: true, employeeId: true, date: true, session: true, checkInAt: true,
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

    // Chỉ giữ lại dòng: (1) không rơi vào ngày lễ không phạt, (2) đã QUÁ giờ ra dự kiến + GRACE_HOURS
    // (biết cả ca gãy nhiều buổi / ngày làm khác / ca qua đêm — xem comment đầu file).
    const logs = candidates.filter((l) => {
      if (!l.checkInAt) return false;
      const holiday = holidayByDate.get(l.date);
      if (holiday && !holiday.penalizeLate) return false;
      const times = resolveLogShiftTimes(
        l.employee.shiftOverride,
        l.session,
        l.date,
        l.employee.branch.checkInTime,
        l.employee.branch.checkOutTime
      );
      const dayOffset = isOvernightShift(times.checkInTime, times.checkOutTime) ? 1 : 0;
      const expectedCheckout = vnDateTimeToInstant(l.date, times.checkOutTime, dayOffset);
      const threshold = expectedCheckout.getTime() + GRACE_HOURS * 60 * 60 * 1000;
      return now.getTime() >= threshold;
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

  return NextResponse.json({ ok: true, todayDate, penalized, details });
}
