import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: số dư credit của công ty
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credit = await prisma.talentCredit.findUnique({ where: { companyId }, select: { balance: true } });
  return NextResponse.json({ balance: credit?.balance ?? 0 });
}

// POST: nạp credit (chỉ owner). TODO: nối thanh toán Sepay thật — hiện nạp thủ công/demo.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role !== "owner") return NextResponse.json({ error: "Chỉ chủ công ty nạp credit." }, { status: 403 });

  const { credits } = await req.json();
  const add = Math.max(1, Math.min(1000, parseInt(String(credits), 10) || 0));

  const row = await prisma.talentCredit.upsert({
    where: { companyId },
    create: { companyId, balance: add },
    update: { balance: { increment: add } },
    select: { balance: true },
  });
  return NextResponse.json({ ok: true, balance: row.balance });
}
