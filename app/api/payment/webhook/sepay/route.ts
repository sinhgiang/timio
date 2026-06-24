import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { affiliateSaleEmail, adminPaymentNotifyEmail, customerPaymentConfirmEmail } from "@/lib/emailTemplates";

const SEPAY_API_KEY = process.env.SEPAY_WEBHOOK_KEY || "timio_sepay_webhook_2026";
const HOLD_MS = 30 * 24 * 60 * 60 * 1000;
const COMMISSION_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

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
  const planLabel = payment.plan === "business" ? "Business" : "Pro";
  const planPrice = PLAN_PRICES[payment.plan] ?? 299000;

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

  // ── 3 email thông báo song song ───────────────────────────────────────────
  void sendPaymentEmails({ company, payment, planLabel, planPrice, newExpiry, now });

  return NextResponse.json({ success: true });
}

async function sendPaymentEmails(opts: {
  company: { id: string; name: string; slug: string; affiliateCode: string | null };
  payment: { plan: string; months: number };
  planLabel: string;
  planPrice: number;
  newExpiry: Date;
  now: Date;
}) {
  const { company, payment, planLabel, planPrice, newExpiry, now } = opts;

  // Lấy thông tin affiliate (nếu có) và owner của công ty song song
  const [affiliate, ownerAdmin] = await Promise.all([
    company.affiliateCode
      ? prisma.affiliate.findUnique({ where: { code: company.affiliateCode } })
      : null,
    prisma.admin.findFirst({
      where: { companyId: company.id, role: "owner" },
      select: { name: true, email: true },
    }),
  ]);

  const tasks: Promise<void>[] = [];

  // Email 1: Affiliate — thông báo có hoa hồng
  if (affiliate && company.affiliateCode) {
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
    const commission = Math.round(planPrice * rate / 100);
    const holdEndsAt = new Date(now.getTime() + HOLD_MS);
    const payoutDate = getPayoutDate(holdEndsAt);

    tasks.push(sendEmail({
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
    }));
  }

  // Email 2: Admin Timio — thông báo có đơn mua mới
  const adminNotifyEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (adminNotifyEmail) {
    tasks.push(sendEmail({
      to: adminNotifyEmail,
      subject: `💰 Timio: ${company.name} vừa mua gói ${planLabel}`,
      html: adminPaymentNotifyEmail({
        companyName: company.name,
        companySlug: company.slug,
        planLabel,
        planPrice,
        months: payment.months,
        affiliateCode: company.affiliateCode,
        affiliateName: affiliate?.name ?? null,
        newExpiry,
      }),
    }));
  }

  // Email 3: Khách hàng — xác nhận mua hàng thành công
  if (ownerAdmin) {
    tasks.push(sendEmail({
      to: ownerAdmin.email,
      subject: `✅ Timio: Thanh toán thành công — Gói ${planLabel}`,
      html: customerPaymentConfirmEmail({
        adminName: ownerAdmin.name,
        companyName: company.name,
        planLabel,
        planPrice,
        months: payment.months,
        newExpiry,
      }),
    }));
  }

  await Promise.all(tasks);
}
