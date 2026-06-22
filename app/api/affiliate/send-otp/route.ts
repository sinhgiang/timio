import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { code, email } = await req.json().catch(() => ({}));
    if (!code || !email) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      select: { id: true, name: true, email: true },
    });

    if (!affiliate) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    // Email phải khớp
    if (affiliate.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Email không khớp với tài khoản này" }, { status: 403 });
    }

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { otp: hashOTP(otp), otpExpiresAt: expires },
    });

    await sendEmail({
      to:      affiliate.email,
      subject: `[Timio] Mã xác thực đăng nhập: ${otp}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1e3a8a">Xin chào, ${affiliate.name}!</h2>
          <p>Mã xác thực đăng nhập dashboard Timio Đối tác của bạn:</p>
          <div style="background:#f0f9ff;border:2px solid #bfdbfe;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1e40af">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:14px">Mã có hiệu lực trong <strong>15 phút</strong>. Không chia sẻ mã này với ai.</p>
          <p style="color:#64748b;font-size:14px">Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
          <p style="color:#94a3b8;font-size:12px">Timio · Hệ thống chấm công thông minh</p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[AffiliateOTP] send:", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
