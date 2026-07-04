import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyRow = await prisma.company.findUnique({ where: { id: user.companyId }, select: { plan: true } });
  if (!companyRow || companyRow.plan === "starter") {
    return NextResponse.json({ error: "Thông báo Zalo OA chỉ có trong gói Pro trở lên" }, { status: 403 });
  }

  const body = await req.json();

  // Cập nhật TỪNG PHẦN — chỉ đổi field được gửi, tránh xoá mất token OAuth
  const data: Record<string, unknown> = {};
  if ("zaloOaId" in body) data.zaloOaId = body.zaloOaId || null;
  if ("zaloAppId" in body) data.zaloAppId = body.zaloAppId || null;
  if ("zaloSecretKey" in body) data.zaloSecretKey = body.zaloSecretKey || null;
  if ("zaloOaToken" in body) {
    data.zaloOaToken = body.zaloOaToken || null;
    data.zaloTokenExpiresAt = body.zaloOaToken ? new Date(Date.now() + 3600 * 1000) : null;
  }
  if ("zaloRefreshToken" in body) data.zaloRefreshToken = body.zaloRefreshToken || null;

  await prisma.company.update({ where: { id: user.companyId }, data });

  return NextResponse.json({ ok: true });
}
