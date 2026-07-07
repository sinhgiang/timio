import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (auth.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(auth);
  const candScope = b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {};

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const candidates = await prisma.candidate.findMany({
      where: { companyId: auth.companyId, ...candScope, ...(status && status !== "all" ? { status } : {}) },
      select: {
        id: true, name: true, phone: true, email: true, status: true, aiScore: true, aiSummary: true,
        experience: true, cvFileName: true, cvUrl: true, interviewAt: true, appliedAt: true,
        job: { select: { title: true } },
      },
      orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { appliedAt: "desc" }],
      take: 100,
    });

    // Đếm theo trạng thái để hiện badge
    const all = await prisma.candidate.findMany({
      where: { companyId: auth.companyId, ...candScope },
      select: { status: true },
    });
    const counts: Record<string, number> = {};
    for (const c of all) counts[c.status] = (counts[c.status] ?? 0) + 1;

    return NextResponse.json({
      counts,
      candidates: candidates.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? "",
        email: c.email ?? "",
        jobTitle: c.job?.title ?? "",
        status: c.status,
        aiScore: c.aiScore,
        aiSummary: c.aiSummary ?? "",
        experience: c.experience ?? "",
        hasCv: !!(c.cvFileName || c.cvUrl),
        interviewAt: c.interviewAt ? c.interviewAt.toISOString() : null,
        appliedAt: c.appliedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[mobile/manager/recruitment]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
