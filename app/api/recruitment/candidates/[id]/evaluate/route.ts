import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAgainstCriteria, aiConfigured } from "@/lib/recruitAI";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — đánh giá ứng viên theo tiêu chí của tin tuyển dụng (Business). Lưu criteriaResult.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") return NextResponse.json({ error: "Đánh giá theo tiêu chí chỉ có ở gói Business.", locked: true }, { status: 403 });
  if (!aiConfigured()) return NextResponse.json({ error: "Chưa cấu hình AI (ANTHROPIC_API_KEY)." }, { status: 503 });

  const b = scopedBranchId(user);
  const cand = await prisma.candidate.findFirst({
    where: { id: params.id, companyId, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
    select: {
      id: true, name: true, experience: true, notes: true, cvFile: true,
      job: { select: { title: true, criteria: true } },
    },
  });
  if (!cand) return NextResponse.json({ error: "Không tìm thấy ứng viên." }, { status: 404 });

  let criteria: string[] = [];
  try { criteria = cand.job?.criteria ? JSON.parse(cand.job.criteria) : []; } catch { criteria = []; }
  if (criteria.length === 0) {
    return NextResponse.json({ error: "Tin tuyển dụng chưa có tiêu chí. Hãy thêm tiêu chí trong phần chỉnh sửa vị trí." }, { status: 400 });
  }

  // CV file (nếu có) — data URI → base64 + mediaType
  let cv: { file?: { data: string; mediaType: string } } | undefined;
  if (cand.cvFile) {
    const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(cand.cvFile);
    if (m && ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(m[1])) {
      cv = { file: { data: m[2], mediaType: m[1] } };
    }
  }

  const results = await evaluateAgainstCriteria(
    { name: cand.name, experience: cand.experience, notes: cand.notes },
    { title: cand.job?.title ?? "" },
    criteria,
    cv
  );

  await prisma.candidate.update({ where: { id: cand.id }, data: { criteriaResult: JSON.stringify(results) } });
  const passCount = results.filter((r) => r.verdict === "pass").length;
  return NextResponse.json({ ok: true, results, passCount, total: results.length });
}
