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

  return NextResponse.json({ success: true });
}
