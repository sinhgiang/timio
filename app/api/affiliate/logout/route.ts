import { NextRequest, NextResponse } from "next/server";
import { AFF_COOKIE } from "@/lib/affiliateAuth";

export async function POST(req: NextRequest) {
  const code     = req.nextUrl.searchParams.get("code") ?? "";
  const response = NextResponse.json({ success: true });
  response.cookies.set(AFF_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
