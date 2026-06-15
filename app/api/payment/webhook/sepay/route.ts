import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEPAY_API_KEY = process.env.SEPAY_WEBHOOK_KEY || "timio_sepay_webhook_2026";

export async function POST(req: NextRequest) {
  // Verify API key from Authorization header
  const authHeader = req.headers.get("Authorization") || "";
  const expectedAuth = `Apikey ${SEPAY_API_KEY}`;
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = String(body.content || "");
  const amount = Number(body.transferAmount || 0);
  const transferType = String(body.transferType || "");

  // Only process incoming transfers
  if (transferType !== "in") {
    return NextResponse.json({ success: true, message: "Skipped outgoing" });
  }

  // Find payment reference in content (format: TIMIO_XXXXXX)
  const match = content.match(/TIMIO_([A-Z0-9]{6,})/i);
  if (!match) {
    return NextResponse.json({ success: true, message: "No Timio reference found" });
  }

  const reference = `TIMIO_${match[1].toUpperCase()}`;

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    return NextResponse.json({ success: true, message: "Payment not found" });
  }

  if (payment.status === "completed") {
    return NextResponse.json({ success: true, message: "Already completed" });
  }

  // Verify amount matches
  if (amount < payment.amount) {
    return NextResponse.json({ success: true, message: "Amount insufficient" });
  }

  const now = new Date();

  // Check not expired
  if (payment.expiresAt < now) {
    await prisma.payment.update({ where: { reference }, data: { status: "expired" } });
    return NextResponse.json({ success: true, message: "Payment expired" });
  }

  // Calculate new plan expiry (extend from current expiry or today)
  const company = await prisma.company.findUnique({ where: { id: payment.companyId } });
  if (!company) {
    return NextResponse.json({ success: true, message: "Company not found" });
  }

  const baseDate =
    company.planExpires && company.planExpires > now ? company.planExpires : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + payment.months);

  await prisma.$transaction([
    prisma.payment.update({
      where: { reference },
      data: { status: "completed", paidAt: now },
    }),
    prisma.company.update({
      where: { id: payment.companyId },
      data: { plan: payment.plan, planExpires: newExpiry },
    }),
  ]);

  // Referral reward: tặng 30 ngày cho cả 2 bên nếu đây là lần đầu mua Pro/Business
  const isPaidPlan = payment.plan === "pro" || payment.plan === "business";
  if (isPaidPlan && company.referredBy) {
    const previousPayments = await prisma.payment.count({
      where: { companyId: payment.companyId, status: "completed", id: { not: payment.id } },
    });
    if (previousPayments === 0) {
      const referrer = await prisma.company.findUnique({ where: { slug: company.referredBy } });
      if (referrer) {
        const BONUS_DAYS = 30;
        // Extend referrer expiry only — never downgrade their plan
        const referrerBase = referrer.planExpires && referrer.planExpires > now ? referrer.planExpires : now;
        const referrerExpiry = new Date(referrerBase);
        referrerExpiry.setDate(referrerExpiry.getDate() + BONUS_DAYS);
        // Extend new company expiry on top of newExpiry
        const newCompanyBonusExpiry = new Date(newExpiry);
        newCompanyBonusExpiry.setDate(newCompanyBonusExpiry.getDate() + BONUS_DAYS);
        // Referrer keeps their current plan — only extend planExpires
        // If referrer is on starter, upgrade to pro as the bonus
        const referrerPlanUpdate = referrer.plan === "starter" ? { plan: "pro", planExpires: referrerExpiry } : { planExpires: referrerExpiry };
        await prisma.$transaction([
          prisma.company.update({ where: { id: referrer.id }, data: referrerPlanUpdate }),
          prisma.company.update({ where: { id: payment.companyId }, data: { planExpires: newCompanyBonusExpiry } }),
        ]);
      }
    }
  }

  return NextResponse.json({ success: true });
}
