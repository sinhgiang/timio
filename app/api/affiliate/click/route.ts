import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function detectDevice(ua: string): "mobile" | "desktop" | "tablet" {
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

// Tìm affiliate theo code hiện tại hoặc code cũ (AffiliateCodeHistory)
async function resolveAffiliate(code: string): Promise<string | null> {
  const aff = await prisma.affiliate.findUnique({ where: { code }, select: { code: true } });
  if (aff) return aff.code;

  // Code cũ → lấy affiliate hiện tại
  const history = await prisma.affiliateCodeHistory.findUnique({
    where: { oldCode: code },
    include: { affiliate: { select: { code: true } } },
  });
  return history?.affiliate.code ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const { code, referrer } = await req.json().catch(() => ({}));
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    const currentCode = await resolveAffiliate(code);
    if (!currentCode) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;
    const device    = userAgent ? detectDevice(userAgent) : null;

    const click = await prisma.affiliateClick.create({
      data: {
        affiliateCode: currentCode, // luôn dùng code hiện tại để thống nhất tracking
        ip,
        userAgent,
        referrer: referrer || null,
        device,
      },
    });

    return NextResponse.json({ clickId: click.id });
  } catch (err) {
    console.error("[AffiliateClick] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
