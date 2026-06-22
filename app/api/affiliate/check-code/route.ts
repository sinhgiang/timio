import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code        = (searchParams.get("code") ?? "").trim().toLowerCase();
  const currentCode = (searchParams.get("current") ?? "").trim().toLowerCase();

  if (!code) return NextResponse.json({ available: false, reason: "Thiếu code" });

  // Format: chỉ cho phép a-z, 0-9, dấu gạch ngang, 3–40 ký tự
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(code)) {
    return NextResponse.json({
      available: false,
      reason: "Chỉ dùng chữ thường, số, dấu gạch ngang (-). Tối thiểu 3 ký tự.",
    });
  }

  // Nếu không đổi gì thì "available"
  if (code === currentCode) {
    return NextResponse.json({ available: true });
  }

  // Kiểm tra trong Affiliate.code
  const existing = await prisma.affiliate.findUnique({ where: { code }, select: { code: true } });
  if (existing) {
    return NextResponse.json({ available: false, reason: "Code này đã có người dùng, hãy chọn code khác." });
  }

  // Kiểm tra trong AffiliateCodeHistory (old codes của người khác)
  const history = await prisma.affiliateCodeHistory.findUnique({ where: { oldCode: code }, select: { oldCode: true } });
  if (history) {
    return NextResponse.json({ available: false, reason: "Code này đã từng được dùng, hãy chọn code khác." });
  }

  return NextResponse.json({ available: true });
}
