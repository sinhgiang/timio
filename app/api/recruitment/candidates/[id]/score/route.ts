import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scoreCandidate, aiConfigured } from "@/lib/recruitAI";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Chấm điểm AI chỉ có ở gói Business. Vui lòng nâng cấp để dùng." }, { status: 403 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ Timio." }, { status: 503 });
  }

  const b = scopedBranchId(user!);
  const cand = await prisma.candidate.findFirst({
    where: { id: params.id, companyId, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
    select: {
      id: true, name: true, experience: true, phone: true, notes: true, cvUrl: true, cvFile: true,
      job: { select: { title: true, requirements: true, description: true } },
    },
  });
  if (!cand) return NextResponse.json({ error: "Không tìm thấy ứng viên" }, { status: 404 });

  // Tách CV file (data URI) thành base64 + mediaType để AI đọc
  let cvFilePart: { data: string; mediaType: string } | undefined;
  if (cand.cvFile) {
    const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(cand.cvFile);
    if (m) cvFilePart = { data: m[2], mediaType: m[1] };
  }

  try {
    const result = await scoreCandidate(
      { name: cand.name, experience: cand.experience, phone: cand.phone, notes: cand.notes },
      { title: cand.job.title, requirements: cand.job.requirements, description: cand.job.description },
      { file: cvFilePart, link: cand.cvUrl }
    );
    await prisma.candidate.update({
      where: { id: cand.id },
      data: { aiScore: result.score, aiSummary: result.summary },
    });
    return NextResponse.json({ ok: true, aiScore: result.score, aiSummary: result.summary });
  } catch (e) {
    console.error("[candidate/score] lỗi:", e);
    return NextResponse.json({ error: "AI đang bận, vui lòng thử lại sau ít phút." }, { status: 502 });
  }
}
