import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestCriteria, aiConfigured } from "@/lib/recruitAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — AI gợi ý tiêu chí đánh giá từ tin tuyển dụng (Business). body: {title, requirements, description, workTime}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") return NextResponse.json({ error: "Tính năng AI chỉ có ở gói Business.", locked: true }, { status: 403 });
  if (!aiConfigured()) return NextResponse.json({ error: "Chưa cấu hình AI (ANTHROPIC_API_KEY)." }, { status: 503 });

  const { title, requirements, description, workTime } = await req.json().catch(() => ({}));
  if (!title) return NextResponse.json({ error: "Thiếu tên vị trí." }, { status: 400 });

  const criteria = await suggestCriteria({ title, requirements, description, workTime });
  return NextResponse.json({ criteria });
}
