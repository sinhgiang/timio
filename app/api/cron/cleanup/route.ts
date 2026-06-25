import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Advertised retention (shown to users on pricing page)
const ADVERTISED_DAYS: Record<string, number> = {
  starter: 90,
  pro: 365,       // 1 year
  business: 1095, // 3 years
};

// Actual deletion cutoff = advertised + 60-day grace buffer.
// The buffer is invisible to users but allows data recovery if they
// upgrade or contact support within 2 months after the advertised limit.
// After the full window (advertised + 60 days), data is permanently deleted.
const GRACE_DAYS = 60;

/**
 * Vercel Cron: runs at 02:00 AM Vietnam time (19:00 UTC) every day.
 * Deletes AttendanceLog and resolved LeaveRequest records older than
 * the company's plan retention limit + 60-day grace buffer.
 *
 * Secured by CRON_SECRET env var — only Vercel Cron (and manual curl) can trigger.
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
  const report: { company: string; plan: string; cutoff: string; logs: number; leaves: number }[] = [];

  for (const company of companies) {
    const advertised = ADVERTISED_DAYS[company.plan] ?? ADVERTISED_DAYS.starter;
    const retentionDays = advertised + GRACE_DAYS; // actual deletion is 60 days later

    // Cutoff date for AttendanceLog (stored as "YYYY-MM-DD" string)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Delete old AttendanceLog records (bulk of data)
    const { count: logCount } = await prisma.attendanceLog.deleteMany({
      where: {
        employee: { companyId: company.id },
        date: { lt: cutoffStr },
      },
    });

    // Delete old resolved LeaveRequests (approved/rejected only — keep pending ones)
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
        cutoff: cutoffStr,
        logs: logCount,
        leaves: leaveCount,
      });
    }
  }

  console.log(`[Cron Cleanup] logs=${logsDeleted} leaves=${leavesDeleted}`, report);

  return NextResponse.json({
    success: true,
    companiesChecked: companies.length,
    logsDeleted,
    leavesDeleted,
    report,
  });
}
