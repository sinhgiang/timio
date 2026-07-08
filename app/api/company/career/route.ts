import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — cập nhật giới thiệu công ty trên trang tuyển dụng (owner)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role !== "owner") return NextResponse.json({ error: "Chỉ chủ công ty được sửa." }, { status: 403 });

  const { careerIntro } = await req.json().catch(() => ({}));
  const val = typeof careerIntro === "string" ? careerIntro.slice(0, 2000).trim() : "";
  await prisma.company.update({ where: { id: companyId }, data: { careerIntro: val || null } });
  return NextResponse.json({ ok: true });
}
