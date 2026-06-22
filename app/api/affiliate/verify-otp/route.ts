import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAffToken, AFF_COOKIE, AFF_COOKIE_OPTIONS } from "@/lib/affiliateAuth";
import crypto from "crypto";

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { code, email, otp } = await req.json().catch(() => ({}));
    if (!code || !email || !otp) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      select: { id: true, email: true, otp: true, otpExpiresAt: true },
    });

    if (!affiliate || affiliate.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Thông tin không hợp lệ" }, { status: 403 });
    }

    if (!affiliate.otp || !affiliate.otpExpiresAt) {
      return NextResponse.json({ error: "Chưa yêu cầu mã OTP" }, { status: 400 });
    }

    if (new Date() > affiliate.otpExpiresAt) {
      return NextResponse.json({ error: "Mã OTP đã hết hạn, vui lòng gửi lại" }, { status: 400 });
    }

    const otpHash = hashOTP(otp.trim());
    if (!crypto.timingSafeEqual(Buffer.from(otpHash), Buffer.from(affiliate.otp))) {
      return NextResponse.json({ error: "Mã OTP không đúng" }, { status: 400 });
    }

    // OTP đúng → xóa OTP, tạo session cookie
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { otp: null, otpExpiresAt: null },
    });

    const token    = signAffToken(code, affiliate.email);
    const response = NextResponse.json({ success: true });
    response.cookies.set(AFF_COOKIE, token, AFF_COOKIE_OPTIONS);
    return response;
  } catch (err) {
    console.error("[AffiliateOTP] verify:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
