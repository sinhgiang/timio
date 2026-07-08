import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — chi tiết chiến dịch + danh sách contact
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const campaign = await prisma.outreachCampaign.findFirst({
    where: { id: params.id, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
  });
  if (!campaign) return NextResponse.json({ error: "Không tìm thấy chiến dịch." }, { status: 404 });

  const job = await prisma.jobPosting.findUnique({
    where: { id: campaign.jobId },
    select: { id: true, title: true, location: true, workTime: true, salaryMin: true, salaryMax: true, benefits: true },
  });

  const contacts = await prisma.outreachContact.findMany({
    where: { campaignId: campaign.id },
    orderBy: [{ matchScore: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    campaign,
    job,
    contacts: contacts.map((c) => ({
      ...c,
      messages: c.messages ? safeParse(c.messages) : [],
    })),
  });
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return []; }
}

// DELETE — xóa chiến dịch (và contact của nó)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const campaign = await prisma.outreachCampaign.findFirst({
    where: { id: params.id, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    select: { id: true },
  });
  if (!campaign) return NextResponse.json({ error: "Không tìm thấy chiến dịch." }, { status: 404 });

  await prisma.outreachContact.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.outreachCampaign.delete({ where: { id: campaign.id } });
  return NextResponse.json({ ok: true });
}
