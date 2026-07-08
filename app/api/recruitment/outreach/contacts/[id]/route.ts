import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trạng thái admin được phép đặt tay (cập nhật phễu)
const ALLOWED = ["sent", "opened", "replied", "interested", "interviewed", "hired", "declined"];

// PATCH — cập nhật trạng thái phễu thủ công. body: { status }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const contact = await prisma.outreachContact.findFirst({ where: { id: params.id, companyId }, select: { id: true, campaignId: true } });
  if (!contact) return NextResponse.json({ error: "Không tìm thấy ứng viên." }, { status: 404 });

  const b = scopedBranchId(user);
  if (b) {
    const camp = await prisma.outreachCampaign.findFirst({ where: { id: contact.campaignId, OR: [{ branchId: b }, { branchId: null }] }, select: { id: true } });
    if (!camp) return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { status } = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });

  await prisma.outreachContact.update({ where: { id: contact.id }, data: { status } });
  return NextResponse.json({ ok: true });
}

// DELETE — bỏ 1 contact khỏi chiến dịch
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const contact = await prisma.outreachContact.findFirst({ where: { id: params.id, companyId }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  await prisma.outreachContact.delete({ where: { id: contact.id } });
  return NextResponse.json({ ok: true });
}
