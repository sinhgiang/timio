import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateJD, aiConfigured } from "@/lib/recruitAI";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, plan: true, customOptions: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Tính năng AI tuyển dụng chỉ có ở gói Business. Vui lòng nâng cấp để dùng." }, { status: 403 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình. Vui lòng liên hệ Timio." }, { status: 503 });
  }

  const { hint } = await req.json();
  if (!hint || !String(hint).trim()) {
    return NextResponse.json({ error: "Vui lòng mô tả vị trí cần tuyển (VD: tuyển 2 phục vụ ca tối, 25k/giờ)." }, { status: 400 });
  }

  // Dữ liệu công ty để AI viết cho nhất quán
  const opts = company.customOptions
    ? (JSON.parse(company.customOptions) as { departments?: string[]; positions?: string[] })
    : {};
  const [jobTitles, empDepts] = await Promise.all([
    prisma.jobPosting.findMany({ where: { companyId }, select: { title: true }, take: 20, orderBy: { createdAt: "desc" } }),
    prisma.employee.findMany({ where: { companyId }, select: { department: true, position: true }, take: 100 }),
  ]);
  const departments = Array.from(new Set([...(opts.departments ?? []), ...empDepts.map((e) => e.department).filter((d): d is string => !!d)]));
  const positions = Array.from(new Set([...(opts.positions ?? []), ...empDepts.map((e) => e.position).filter((p): p is string => !!p)]));
  const existingTitles = Array.from(new Set(jobTitles.map((j) => j.title)));

  try {
    const jd = await generateJD(String(hint).trim(), {
      name: company.name,
      departments,
      positions,
      existingTitles,
    });
    return NextResponse.json({ ok: true, jd });
  } catch (e) {
    console.error("[ai/jd] lỗi:", e);
    return NextResponse.json({ error: "AI đang bận, vui lòng thử lại sau ít phút." }, { status: 502 });
  }
}
