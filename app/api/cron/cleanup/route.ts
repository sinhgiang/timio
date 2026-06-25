import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STARTER_RETENTION_DAYS, STARTER_BUFFER_DAYS, PAID_GRACE_DAYS } from "@/lib/retention";

/**
 * Vercel Cron: runs at 02:00 AM Vietnam time (19:00 UTC) every day.
 *
 * Deletion policy:
 *
 * FREE (starter):
 *   Rolling window — delete data older than 90 + 90 = 180 days.
 *   (Advertised as 90 days; 90-day hidden buffer before actual delete.)
 *
 * PAID (pro / business) — ACTIVE plan (planExpires is null OR in future):
 *   Keep EVERYTHING. Never delete while the customer is paying.
 *
 * PAID (pro / business) — EXPIRED plan (planExpires in the past):
 *   6-month grace period after expiry. If now > planExpires + 6 months:
 *   delete ALL attendance + leave data for that company.
 *
 * Secured by CRON_SECRET env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const companies = await prisma.company.findMany({
    select: { id: true, plan: true, name: true, planExpires: true },
  });

  let logsDeleted = 0;
  let leavesDeleted = 0;
  const report: {
    company: string;
    plan: string;
    reason: string;
    logs: number;
    leaves: number;
  }[] = [];

  for (const company of companies) {
    let logCount = 0;
    let leaveCount = 0;
    let reason = "";

    if (company.plan === "starter") {
      // Free tier: rolling window (advertised 90d + 90d hidden buffer = 180d actual)
      const totalDays = STARTER_RETENTION_DAYS + STARTER_BUFFER_DAYS;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - totalDays);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      reason = `starter rolling (${totalDays}d)`;

      const r1 = await prisma.attendanceLog.deleteMany({
        where: { employee: { companyId: company.id }, date: { lt: cutoffStr } },
      });
      const r2 = await prisma.leaveRequest.deleteMany({
        where: {
          companyId: company.id,
          status: { in: ["approved", "rejected"] },
          createdAt: { lt: cutoffDate },
        },
      });
      logCount = r1.count;
      leaveCount = r2.count;

    } else {
      // Paid plan (pro / business)
      const planExpires = company.planExpires;

      if (!planExpires || planExpires > now) {
        // Still active — keep everything, skip deletion
        continue;
      }

      // Plan has expired — check if grace period is over
      const gracePeriodEnd = new Date(planExpires);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + PAID_GRACE_DAYS);

      if (now <= gracePeriodEnd) {
        // Still in grace period — keep data, allow recovery if they renew
        continue;
      }

      // Grace period over — delete ALL data for this company
      reason = `paid expired (${Math.floor((now.getTime() - planExpires.getTime()) / 86400000)}d ago, grace=${PAID_GRACE_DAYS}d)`;

      const r1 = await prisma.attendanceLog.deleteMany({
        where: { employee: { companyId: company.id } },
      });
      const r2 = await prisma.leaveRequest.deleteMany({
        where: {
          companyId: company.id,
          status: { in: ["approved", "rejected"] },
        },
      });
      logCount = r1.count;
      leaveCount = r2.count;
    }

    logsDeleted += logCount;
    leavesDeleted += leaveCount;

    if (logCount > 0 || leaveCount > 0) {
      report.push({
        company: company.name,
        plan: company.plan,
        reason,
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
