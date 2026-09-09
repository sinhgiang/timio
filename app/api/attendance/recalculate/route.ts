import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, calculateEarlyLeave, filterApplicableRules, type LateRule } from "@/lib/attendance";

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

    // Load logs cần tính lại: trễ giờ vào (late/very_late) HOẶC đã chấm giờ ra (để tính lại phạt
    // ra sớm — trước đây route này chỉ recalculate phạt trễ, không bao giờ đụng tới phạt ra sớm dù
    // sếp đổi bảng phạt, xem lib/attendance.ts calculateEarlyLeave).
    const logs = await prisma.attendanceLog.findMany({
      where: {
        employee: { companyId },
        date: { startsWith: datePrefix },
        OR: [
          { status: { in: ["late", "very_late"] }, minutesLate: { gt: 0 } },
          { checkOutAt: { not: null } },
        ],
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
      return NextResponse.json({ updated: 0, message: "Không có ngày trễ/về sớm nào trong tháng này." });
    }

    let updated = 0;

    for (const log of logs) {
      // Get shift for this employee (override or branch default)
      let shiftOverrideParsed: {
        checkInTime?: string;
        checkOutTime?: string;
        gracePeriod?: number;
        useDefaultLate?: boolean;
        lateRules?: Array<{ minutes: number; amount: number }>;
      } = {};
      try {
        shiftOverrideParsed = log.employee.shiftOverride ? JSON.parse(log.employee.shiftOverride) : {};
      } catch { shiftOverrideParsed = {}; }

      let latePenalty = 0;
      if (log.checkInAt) {
        const checkInTime = shiftOverrideParsed.checkInTime ?? log.employee.branch.checkInTime;
        const gracePeriod = shiftOverrideParsed.gracePeriod ?? log.employee.branch.gracePeriod;

        let effectiveLateRules: LateRule[];
        if (shiftOverrideParsed.useDefaultLate === false) {
          const empRules = shiftOverrideParsed.lateRules ?? [];
          const sorted = [...empRules].sort((a, b) => a.minutes - b.minutes);
          effectiveLateRules = sorted.map((r, i) => ({
            fromMinutes: r.minutes,
            toMinutes: sorted[i + 1] ? sorted[i + 1].minutes - 1 : 9999,
            amount: r.amount,
          }));
        } else {
          effectiveLateRules = filterApplicableRules(penaltyRules, log.employee, log.checkInAt)
            .filter((r) => r.type !== "early_leave")
            .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
        }

        ({ penaltyAmount: latePenalty } = calculateCheckInStatus(
          log.checkInAt,
          checkInTime,
          gracePeriod,
          effectiveLateRules
        ));
      }

      let minutesEarly = 0;
      let earlyLeavePenalty = 0;
      if (log.checkOutAt) {
        const checkOutTime = shiftOverrideParsed.checkOutTime ?? log.employee.branch.checkOutTime;
        const coGracePeriod = shiftOverrideParsed.gracePeriod ?? log.employee.branch.gracePeriod;
        const earlyRules = filterApplicableRules(penaltyRules, log.employee, log.checkOutAt)
          .filter((r) => r.type === "early_leave")
          .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
        ({ minutesEarly, earlyLeavePenalty } = calculateEarlyLeave(log.checkOutAt, checkOutTime, coGracePeriod, earlyRules));
      }

      const penaltyAmount = latePenalty + earlyLeavePenalty;

      if (
        penaltyAmount !== log.penaltyAmount ||
        minutesEarly !== log.minutesEarly ||
        earlyLeavePenalty !== log.earlyLeavePenalty
      ) {
        await prisma.attendanceLog.update({
          where: { id: log.id },
          data: { penaltyAmount, minutesEarly, earlyLeavePenalty },
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
