import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";
import { generateOutreachMessage, outreachAiConfigured, MAX_OUTREACH_STEPS, type OutreachJobInput } from "@/lib/outreachAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — AI soạn tin cho các contact (theo bước). body: { contactIds?: string[], step?: number }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true, name: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Soạn tin AI chỉ có ở gói Business.", locked: true }, { status: 403 });
  }

  const b = scopedBranchId(user);
  const campaign = await prisma.outreachCampaign.findFirst({
    where: { id: params.id, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
  });
  if (!campaign) return NextResponse.json({ error: "Không tìm thấy chiến dịch." }, { status: 404 });

  const job = await prisma.jobPosting.findUnique({
    where: { id: campaign.jobId },
    select: { title: true, location: true, workTime: true, salaryMin: true, salaryMax: true, benefits: true },
  });
  if (!job) return NextResponse.json({ error: "Vị trí đã bị xóa." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const contactIds: string[] | undefined = Array.isArray(body.contactIds) ? body.contactIds : undefined;

  const contacts = await prisma.outreachContact.findMany({
    where: {
      campaignId: campaign.id,
      ...(contactIds && contactIds.length ? { id: { in: contactIds } } : {}),
      status: { notIn: ["opted_out", "hired", "declined"] },
    },
    take: 50,
  });
  if (contacts.length === 0) {
    return NextResponse.json({ error: "Không có ứng viên nào để soạn tin." }, { status: 400 });
  }

  const jobInput: OutreachJobInput = {
    title: job.title, location: job.location, workTime: job.workTime,
    salaryMin: job.salaryMin, salaryMax: job.salaryMax, benefits: job.benefits,
  };
  const companyName = company?.name ?? "Công ty";

  const drafts: { id: string; subject: string; body: string }[] = [];
  for (const c of contacts) {
    const step = Math.min((body.step as number) || c.step + 1 || 1, MAX_OUTREACH_STEPS);
    const kind = (c.kind === "ex_employee" || c.kind === "candidate" || c.kind === "talent") ? c.kind : "candidate";
    const msg = await generateOutreachMessage(
      { name: c.name, kind, position: c.position, matchReason: c.matchReason },
      jobInput,
      companyName,
      step
    );
    await prisma.outreachContact.update({
      where: { id: c.id },
      data: { draftSubject: msg.subject, draftBody: msg.body, status: c.status === "pending" ? "drafted" : c.status },
    });
    drafts.push({ id: c.id, subject: msg.subject, body: msg.body });
  }

  return NextResponse.json({ ok: true, drafts, ai: outreachAiConfigured() });
}
