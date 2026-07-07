import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSocialPost, aiConfigured } from "@/lib/recruitAI";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, slug: true, plan: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Tính năng AI tuyển dụng chỉ có ở gói Business. Vui lòng nâng cấp để dùng." }, { status: 403 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ Timio." }, { status: 503 });
  }

  const { jobId, origin } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Thiếu jobId" }, { status: 400 });

  const b = scopedBranchId(user!);
  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    select: {
      title: true, department: true, description: true, requirements: true, benefits: true,
      salaryMin: true, salaryMax: true, location: true, workTime: true, quantity: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Không tìm thấy vị trí" }, { status: 404 });

  const base = (typeof origin === "string" && origin) ? origin : "https://timio.vn";
  const publicUrl = `${base}/tuyendung/${company.slug}`;

  try {
    const content = await generateSocialPost(job, publicUrl, company.name);
    return NextResponse.json({ ok: true, content, publicUrl });
  } catch (e) {
    console.error("[ai/social] lỗi:", e);
    return NextResponse.json({ error: "AI đang bận, vui lòng thử lại sau ít phút." }, { status: 502 });
  }
}
