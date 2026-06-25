import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDeletionCutoffDate, ADVERTISED_DAYS, BUFFER_DAYS } from "@/lib/retention";

/**
 * Vercel Cron: runs at 02:00 AM Vietnam time (19:00 UTC) every day.
 *
 * Deletion policy (invisible to users):
 *   Starter  : advertised 90 days  + 90-day buffer  = deleted after 6 months total
 *   Pro      : advertised 1 year   + 6-month buffer = deleted after 18 months total
 *   Business : advertised 3 years  + 1.5-year buffer = deleted after 4.5 years total
 *
 * Users see the "advertised" limit only. Data becomes inaccessible in UI at
 * the advertised limit but remains in DB until the full window expires —
 * allowing recovery if they upgrade within the buffer period.
 *
 * Secured by CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    select: { id: true, plan: true, name: true },
  });

  let logsDeleted = 0;
  let leavesDeleted = 0;
  const report: {
    company: string;
    plan: string;
    advertisedDays: number;
    bufferDays: number;
    actualCutoff: string;
    logs: number;
    leaves: number;
  }[] = [];

  for (const company of companies) {
    const cutoffDate = getDeletionCutoffDate(company.plan);
    const cutoffStr = cutoffDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Delete AttendanceLog records (daily check-in data — the bulk)
    const { count: logCount } = await prisma.attendanceLog.deleteMany({
      where: {
        employee: { companyId: company.id },
        date: { lt: cutoffStr },
      },
    });

    // Delete resolved LeaveRequests (keep pending ones)
    const { count: leaveCount } = await prisma.leaveRequest.deleteMany({
      where: {
        companyId: company.id,
        status: { in: ["approved", "rejected"] },
        createdAt: { lt: cutoffDate },
      },
    });

    logsDeleted += logCount;
    leavesDeleted += leaveCount;

    if (logCount > 0 || leaveCount > 0) {
      report.push({
        company: company.name,
        plan: company.plan,
        advertisedDays: ADVERTISED_DAYS[company.plan] ?? 90,
        bufferDays: BUFFER_DAYS[company.plan] ?? 90,
        actualCutoff: cutoffStr,
        logs: logCount,
        leaves: leaveCount,
      });
    }
  }

  console.log(`[Cron Cleanup] companies=${companies.length} logs=${logsDeleted} leaves=${leavesDeleted}`, report);

  return NextResponse.json({
    success: true,
    companiesChecked: companies.length,
    logsDeleted,
    leavesDeleted,
    report,
  });
}
