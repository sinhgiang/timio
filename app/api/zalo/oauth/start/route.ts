import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bắt đầu uỷ quyền OA: chuyển hướng owner sang trang đồng ý của Zalo
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { zaloAppId: true, plan: true },
  });

  if (!company || company.plan === "starter") {
    return NextResponse.redirect(new URL("/dashboard/settings?zalo=plan", req.url));
  }
  if (!company.zaloAppId) {
    return NextResponse.redirect(new URL("/dashboard/settings?zalo=noappid", req.url));
  }

  const redirectUri = `${req.nextUrl.origin}/api/zalo/oauth/callback`;
  const permissionUrl =
    `https://oauth.zaloapp.com/v4/oa/permission?app_id=${encodeURIComponent(company.zaloAppId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(permissionUrl);
}
