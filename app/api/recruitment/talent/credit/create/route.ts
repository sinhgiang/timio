import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findPack } from "@/lib/talentPricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return `TIMIO_${ref}`;
}

// Khởi tạo thanh toán NẠP CREDIT cộng đồng qua chuyển khoản (Sepay webhook cộng credit)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role !== "owner") {
    return NextResponse.json({ error: "Chỉ chủ công ty được nạp credit." }, { status: 403 });
  }

  // Credit dùng cho kho ứng viên xác thực — mở cho mọi gói (mua theo lượt).
  const { packId } = await req.json().catch(() => ({}));
  const pack = findPack(String(packId || ""));
  if (!pack) return NextResponse.json({ error: "Gói credit không hợp lệ." }, { status: 400 });

  // Hủy các đơn nạp credit pending cũ của công ty
  await prisma.payment.updateMany({
    where: { companyId, kind: "credit", status: "pending" },
    data: { status: "expired" },
  });

  let reference = generateReference();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.payment.findUnique({ where: { reference } });
    if (!existing) break;
    reference = generateReference();
    attempts++;
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 giờ
  const payment = await prisma.payment.create({
    data: {
      companyId, reference, amount: pack.price,
      plan: "credit", kind: "credit", credits: pack.credits, months: 0, expiresAt,
    },
  });

  return NextResponse.json({
    reference: payment.reference,
    amount: payment.amount,
    credits: pack.credits,
    packLabel: pack.label,
    expiresAt: payment.expiresAt,
    bankName: "MB Bank",
    accountNumber: "833090923004",
    accountName: "GIANG A SINH",
    transferNote: payment.reference,
    qrUrl: `https://img.vietqr.io/image/MB-833090923004-compact2.png?amount=${pack.price}&addInfo=${payment.reference}&accountName=GIANG%20A%20SINH`,
  });
}
