import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — bật/tắt chống ảnh giả (chớp mắt) cho quét mặt. Owner/Manager tổng.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role !== "owner" && user?.role !== "manager") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { faceLiveness } = await req.json().catch(() => ({}));
  await prisma.company.update({ where: { id: companyId }, data: { faceLiveness: !!faceLiveness } });
  return NextResponse.json({ ok: true, faceLiveness: !!faceLiveness });
}
