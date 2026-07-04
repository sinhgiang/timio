import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeOaCode } from "@/lib/zalo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Zalo gọi về đây sau khi OA admin đồng ý uỷ quyền
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const oaId = req.nextUrl.searchParams.get("oa_id");
  const zaloError = req.nextUrl.searchParams.get("error");

  if (zaloError || !code) {
    return NextResponse.redirect(new URL("/dashboard/settings?zalo=denied", req.url));
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { zaloAppId: true, zaloSecretKey: true },
  });
  if (!company?.zaloAppId || !company.zaloSecretKey) {
    return NextResponse.redirect(new URL("/dashboard/settings?zalo=noappid", req.url));
  }

  const result = await exchangeOaCode({
    companyId: user.companyId,
    appId: company.zaloAppId,
    secretKey: company.zaloSecretKey,
    code,
    oaId,
  });

  if (!result.ok) {
    const msg = encodeURIComponent(result.error ?? "unknown");
    return NextResponse.redirect(new URL(`/dashboard/settings?zalo=fail&msg=${msg}`, req.url));
  }

  return NextResponse.redirect(new URL("/dashboard/settings?zalo=ok", req.url));
}
