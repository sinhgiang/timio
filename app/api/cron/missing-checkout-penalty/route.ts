import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findHolidayForDate } from "@/lib/holidayAttendance";

/**
 * Chạy 00:30 VN mỗi ngày (đóng sổ ngày HÔM QUA — xem vercel.json "30 17 * * *" UTC), quét
 * AttendanceLog: có checkInAt nhưng hết ngày vẫn checkOutAt = null → coi là "quên chấm công ra",
 * ghi status="missing_checkout" + trừ tiền phạt CỐ ĐỊNH (Company.missingCheckoutPenaltyAmount,
 * 0 = công ty chưa bật). User phản ánh 14/9/2026: báo cáo vẫn hiện "Đúng giờ" dù giờ ra bỏ
 * trống, không ai biết NV rời lúc nào — yêu cầu phạt nặng hơn cả trễ giờ/về sớm, xem
 * lib/attendance.ts resolveFullDayStatus.
 *
 * Chờ tới 00:30 hôm sau (thay vì cuối ngày hôm đó) để không phạt oan ca đêm/ca gãy còn đang làm
 * dở qua nửa đêm — đánh đổi: NV ca đêm chấm ra sau 00:30 vẫn có khả năng bị phạt nhầm (edge case
 * hiếm, chưa xử lý riêng).
 * Idempotent: lọc status != "missing_checkout" nên chạy lại (Vercel retry) không phạt trùng.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Hôm qua" giờ VN — job chạy 00:30 VN nên ngày vừa đóng sổ là hôm trước ngày hiện tại theo UTC+7.
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnYesterday = new Date(Date.now() + VN_OFFSET_MS - 24 * 60 * 60 * 1000);
  const targetDate = vnYesterday.toISOString().slice(0, 10);
  const [yearStr, monthStr] = targetDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const companies = await prisma.company.findMany({
    where: { missingCheckoutPenaltyAmount: { gt: 0 } },
    select: { id: true, missingCheckoutPenaltyAmount: true },
  });

  let penalized = 0;
  const details: Array<{ companyId: string; count: number }> = [];

  for (const company of companies) {
    const holiday = await findHolidayForDate(company.id, targetDate);
    if (holiday && !holiday.penalizeLate) continue; // Ngày lễ không phạt → khỏi tính quên chấm công

    const logs = await prisma.attendanceLog.findMany({
      where: {
        date: targetDate,
        checkInAt: { not: null },
        checkOutAt: null,
        status: { not: "missing_checkout" },
        employee: { companyId: company.id },
      },
      select: { id: true, employeeId: true },
    });
    if (logs.length === 0) continue;

    const amount = company.missingCheckoutPenaltyAmount;

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
      ...Object.entries(
        logs.reduce<Record<string, number>>((acc, l) => {
          acc[l.employeeId] = (acc[l.employeeId] ?? 0) + amount;
          return acc;
        }, {})
      ).map(([employeeId, total]) =>
        prisma.monthlySummary.upsert({
          where: { employeeId_year_month: { employeeId, year, month } },
          create: { employeeId, year, month, totalPenalty: total },
          update: { totalPenalty: { increment: total } },
        })
      ),
    ]);

    penalized += logs.length;
    details.push({ companyId: company.id, count: logs.length });
  }

  return NextResponse.json({ ok: true, targetDate, penalized, details });
}
