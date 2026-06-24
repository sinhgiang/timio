import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/employee/attendance?employeeId=xxx&month=2026-06
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month"); // YYYY-MM

    if (!employeeId || !month) {
      return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
    }

    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const datePrefix = month; // "2026-06"

    // Tạo danh sách ngày trong tháng
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });

    // Lấy dữ liệu chấm công + tóm tắt tháng
    const [logs, summary, corrections] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { employeeId, date: { startsWith: datePrefix } },
        orderBy: { date: "asc" },
        select: {
          date: true, checkInAt: true, checkOutAt: true,
          minutesLate: true, status: true, penaltyAmount: true,
          minutesOvertime: true, overtimeAmount: true, note: true,
        },
      }),
      prisma.monthlySummary.findUnique({
        where: { employeeId_year_month: { employeeId, year, month: mon } },
      }),
      prisma.correctionRequest.findMany({
        where: { employeeId, date: { startsWith: datePrefix } },
        select: { id: true, date: true, type: true, status: true, requestedCheckIn: true, requestedCheckOut: true },
      }),
    ]);

    const logMap = new Map(logs.map((l) => [l.date, l]));
    const correctionMap = new Map(corrections.map((c) => [c.date, c]));

    const calendar = dates.map((date) => {
      const log = logMap.get(date);
      const correction = correctionMap.get(date);
      return {
        date,
        checkInAt: log?.checkInAt?.toISOString() ?? null,
        checkOutAt: log?.checkOutAt?.toISOString() ?? null,
        minutesLate: log?.minutesLate ?? 0,
        status: log?.status ?? "absent",
        penaltyAmount: log?.penaltyAmount ?? 0,
        minutesOvertime: log?.minutesOvertime ?? 0,
        note: log?.note ?? null,
        correction: correction ?? null,
      };
    });

    return NextResponse.json({ calendar, summary });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
