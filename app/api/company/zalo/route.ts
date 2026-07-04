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

  const { zaloOaToken, zaloOaId, zaloAppId, zaloSecretKey, zaloRefreshToken } = await req.json();

  // Khi dán token mới → đặt hạn 24h (Zalo OA token sống ~25h), sau đó tự gia hạn
  const expiresAt = zaloOaToken ? new Date(Date.now() + 24 * 3600 * 1000) : null;

  await prisma.company.update({
    where: { id: user.companyId },
    data: {
      zaloOaToken: zaloOaToken || null,
      zaloOaId: zaloOaId || null,
      zaloAppId: zaloAppId || null,
      zaloSecretKey: zaloSecretKey || null,
      zaloRefreshToken: zaloRefreshToken || null,
      zaloTokenExpiresAt: expiresAt,
    },
  });

  return NextResponse.json({ ok: true });
}
