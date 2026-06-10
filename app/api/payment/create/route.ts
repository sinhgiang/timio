import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_PRICES: Record<string, number> = {
  pro: 299000,
};

const PROMO_PRICES: Record<string, number> = {
  welcome: 150000, // 150k/month for welcome promo
};

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TIMIO_${ref}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan = "pro", months = 1, promo } = await req.json().catch(() => ({}));

  if (!PLAN_PRICES[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const pricePerMonth = (promo && PROMO_PRICES[promo]) ? PROMO_PRICES[promo] : PLAN_PRICES[plan];
  const amount = pricePerMonth * months;

  // Expire old pending payments for this company
  await prisma.payment.updateMany({
    where: { companyId, status: "pending" },
    data: { status: "expired" },
  });

  // Generate unique reference
  let reference = generateReference();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.payment.findUnique({ where: { reference } });
    if (!existing) break;
    reference = generateReference();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  const payment = await prisma.payment.create({
    data: { companyId, reference, amount, plan, months, expiresAt },
  });

  return NextResponse.json({
    reference: payment.reference,
    amount: payment.amount,
    expiresAt: payment.expiresAt,
    bankName: "MB Bank",
    accountNumber: "833090923004",
    accountName: "SINH GIANG",
    transferNote: payment.reference,
    qrUrl: `https://img.vietqr.io/image/MB-833090923004-compact2.png?amount=${amount}&addInfo=${payment.reference}&accountName=SINH%20GIANG`,
  });
}
