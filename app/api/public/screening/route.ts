import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateScreeningQuestions } from "@/lib/recruitAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/public/screening?slug=&jobId= — câu hỏi sàng lọc cho trang ứng tuyển (public).
// Chỉ trả câu hỏi cho công ty gói Business (tính năng AI). Gói khác → rỗng (không sàng lọc).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();
  const jobId = (searchParams.get("jobId") || "").trim();
  if (!slug || !jobId) return NextResponse.json({ questions: [] });

  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true, plan: true } });
  if (!company || company.plan !== "business") return NextResponse.json({ questions: [] });

  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId: company.id, status: "open", isPublic: true },
    select: { title: true, requirements: true, description: true, workTime: true },
  });
  if (!job) return NextResponse.json({ questions: [] });

  const questions = await generateScreeningQuestions(job);
  return NextResponse.json({ questions });
}
