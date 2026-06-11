import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus } from "@/lib/attendance";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { year, month } = await req.json();
    if (!year || !month) return NextResponse.json({ error: "Thiếu year/month" }, { status: 400 });

    const datePrefix = `${year}-${String(month).padStart(2, "0")}`;

    // Load penalty rules for this company
    const penaltyRules = await prisma.penaltyRule.findMany({ where: { companyId } });
    if (penaltyRules.length === 0) {
      return NextResponse.json({ error: "Chưa có bảng phạt. Vào Cài đặt → Bảng phạt để thêm." }, { status: 400 });
    }

    // Load all late logs for this company in the given month
    const logs = await prisma.attendanceLog.findMany({
      where: {
        employee: { companyId },
        date: { startsWith: datePrefix },
        status: { in: ["late", "very_late"] },
        minutesLate: { gt: 0 },
      },
      include: {
        employee: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (logs.length === 0) {
      return NextResponse.json({ updated: 0, message: "Không có ngày trễ nào trong tháng này." });
    }

    let updated = 0;

    for (const log of logs) {
      if (!log.checkInAt) continue;

      // Get shift for this employee (override or branch default)
      let shiftOverrideParsed: { checkInTime?: string; gracePeriod?: number } = {};
      try {
        shiftOverrideParsed = log.employee.shiftOverride ? JSON.parse(log.employee.shiftOverride) : {};
      } catch { shiftOverrideParsed = {}; }

      const checkInTime = shiftOverrideParsed.checkInTime ?? log.employee.branch.checkInTime;
      const gracePeriod = shiftOverrideParsed.gracePeriod ?? log.employee.branch.gracePeriod;

      const { penaltyAmount } = calculateCheckInStatus(
        log.checkInAt,
        checkInTime,
        gracePeriod,
        penaltyRules
      );

      if (penaltyAmount !== log.penaltyAmount) {
        await prisma.attendanceLog.update({
          where: { id: log.id },
          data: { penaltyAmount },
        });
        updated++;
      }
    }

    // Recalculate MonthlySummary.totalPenalty for affected employees
    const affectedEmployeeIds = Array.from(new Set(logs.map((l) => l.employeeId)));
    for (const employeeId of affectedEmployeeIds) {
      const employeeLogs = await prisma.attendanceLog.findMany({
        where: { employeeId, date: { startsWith: datePrefix } },
      });
      const totalPenalty = employeeLogs.reduce((sum, l) => sum + l.penaltyAmount, 0);

      await prisma.monthlySummary.upsert({
        where: { employeeId_year_month: { employeeId, year, month } },
        create: { employeeId, year, month, totalPenalty },
        update: { totalPenalty },
      });
    }

    return NextResponse.json({
      updated,
      total: logs.length,
      message: updated > 0
        ? `Đã cập nhật ${updated}/${logs.length} bản ghi.`
        : "Tất cả bản ghi đã đúng, không cần cập nhật.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
