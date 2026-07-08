import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH — đánh dấu đã trả thưởng / đặt mức thưởng. body: { status?, rewardAmount? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const ref = await prisma.referral.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!ref) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });

  const { status, rewardAmount } = await req.json().catch(() => ({}));
  const data: { status?: string; rewardAmount?: number } = {};
  if (status && ["applied", "hired", "rewarded"].includes(status)) data.status = status;
  if (typeof rewardAmount === "number" && rewardAmount >= 0) data.rewardAmount = Math.round(rewardAmount);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });

  await prisma.referral.update({ where: { id: ref.id }, data });
  return NextResponse.json({ ok: true });
}
