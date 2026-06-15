import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { affiliateSaleEmail } from "@/lib/emailTemplates";

const SEPAY_API_KEY = process.env.SEPAY_WEBHOOK_KEY || "timio_sepay_webhook_2026";
const HOLD_MS = 30 * 24 * 60 * 60 * 1000;
const COMMISSION_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;

const PLAN_PRICES: Record<string, number> = { pro: 299000, business: 799000 };

function getPayoutDate(holdEndsAt: Date): Date {
  const d15 = new Date(holdEndsAt.getFullYear(), holdEndsAt.getMonth(), 15);
  return d15 > holdEndsAt ? d15 : new Date(holdEndsAt.getFullYear(), holdEndsAt.getMonth() + 1, 15);
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  if (authHeader !== `Apikey ${SEPAY_API_KEY}`) {
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

  if (transferType !== "in") {
    return NextResponse.json({ success: true, message: "Skipped outgoing" });
  }

  const match = content.match(/TIMIO_([A-Z0-9]{6,})/i);
  if (!match) {
    return NextResponse.json({ success: true, message: "No Timio reference found" });
  }

  const reference = `TIMIO_${match[1].toUpperCase()}`;
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return NextResponse.json({ success: true, message: "Payment not found" });
  if (payment.status === "completed") return NextResponse.json({ success: true, message: "Already completed" });
  if (amount < payment.amount) return NextResponse.json({ success: true, message: "Amount insufficient" });

  const now = new Date();

  if (payment.expiresAt < now) {
    await prisma.payment.update({ where: { reference }, data: { status: "expired" } });
    return NextResponse.json({ success: true, message: "Payment expired" });
  }

  const company = await prisma.company.findUnique({ where: { id: payment.companyId } });
  if (!company) return NextResponse.json({ success: true, message: "Company not found" });

  const baseDate = company.planExpires && company.planExpires > now ? company.planExpires : now;
  const newExpiry = new Date(baseDate);
  newExpiry.setMonth(newExpiry.getMonth() + payment.months);

  await prisma.$transaction([
    prisma.payment.update({ where: { reference }, data: { status: "completed", paidAt: now } }),
    prisma.company.update({ where: { id: payment.companyId }, data: { plan: payment.plan, planExpires: newExpiry } }),
  ]);

  const isPaidPlan = payment.plan === "pro" || payment.plan === "business";

  // ── Referral reward: tặng 30 ngày cho cả 2 bên khi lần đầu mua ──────────
  if (isPaidPlan && company.referredBy) {
    const previousPayments = await prisma.payment.count({
      where: { companyId: payment.companyId, status: "completed", id: { not: payment.id } },
    });
    if (previousPayments === 0) {
      const referrer = await prisma.company.findUnique({ where: { slug: company.referredBy } });
      if (referrer) {
        const BONUS_DAYS = 30;
        const referrerBase = referrer.planExpires && referrer.planExpires > now ? referrer.planExpires : now;
        const referrerExpiry = new Date(referrerBase);
        referrerExpiry.setDate(referrerExpiry.getDate() + BONUS_DAYS);
        const bonusExpiry = new Date(newExpiry);
        bonusExpiry.setDate(bonusExpiry.getDate() + BONUS_DAYS);
        const referrerPlanUpdate =
          referrer.plan === "starter"
            ? { plan: "pro", planExpires: referrerExpiry }
            : { planExpires: referrerExpiry };
        await prisma.$transaction([
          prisma.company.update({ where: { id: referrer.id }, data: referrerPlanUpdate }),
          prisma.company.update({ where: { id: payment.companyId }, data: { planExpires: bonusExpiry } }),
        ]);
      }
    }
  }

  // ── Affiliate commission: gửi email thông báo hoa hồng ───────────────────
  if (isPaidPlan && company.affiliateCode) {
    void notifyAffiliate({ company, payment, now });
  }

  return NextResponse.json({ success: true });
}

async function notifyAffiliate(opts: {
  company: { name: string; affiliateCode: string | null };
  payment: { plan: string };
  now: Date;
}) {
  const { company, payment, now } = opts;
  if (!company.affiliateCode) return;

  const affiliate = await prisma.affiliate.findUnique({ where: { code: company.affiliateCode } });
  if (!affiliate) return;

  // Xác định tier dựa trên số công ty đã eligible (đã qua hold + trong window)
  const affiliateCompanies = await prisma.company.findMany({
    where: { affiliateCode: company.affiliateCode },
    select: { id: true },
  });
  const companyIds = affiliateCompanies.map((c) => c.id);

  const allPayments = await prisma.payment.findMany({
    where: { companyId: { in: companyIds }, status: "completed" },
    select: { companyId: true, paidAt: true },
    orderBy: { paidAt: "asc" },
  });

  // Lấy lần trả tiền đầu tiên của mỗi công ty
  const firstPaidMap = new Map<string, Date>();
  for (const p of allPayments) {
    if (p.paidAt && !firstPaidMap.has(p.companyId)) {
      firstPaidMap.set(p.companyId, p.paidAt);
    }
  }

  let eligibleCount = 0;
  firstPaidMap.forEach((fp) => {
    const age = now.getTime() - fp.getTime();
    if (age >= HOLD_MS && age < COMMISSION_WINDOW_MS) eligibleCount++;
  });

  const rate = eligibleCount >= 21 ? 20 : eligibleCount >= 6 ? 15 : 10;
  const planPrice = PLAN_PRICES[payment.plan] ?? 299000;
  const commission = Math.round(planPrice * rate / 100);
  const planLabel = payment.plan === "business" ? "Business" : "Pro";

  const holdEndsAt = new Date(now.getTime() + HOLD_MS);
  const payoutDate = getPayoutDate(holdEndsAt);

  await sendEmail({
    to: affiliate.email,
    subject: `🎉 Timio: ${company.name} vừa mua gói ${planLabel} — hoa hồng ${new Intl.NumberFormat("vi-VN").format(commission)}đ`,
    html: affiliateSaleEmail({
      affiliateName: affiliate.name,
      companyName: company.name,
      planLabel,
      planPrice,
      rate,
      commission,
      holdEndsAt,
      payoutDate,
      affiliateCode: affiliate.code,
    }),
  });
}
