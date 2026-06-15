import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: "SMTP chưa cấu hình — thêm SMTP_USER và SMTP_PASS vào biến môi trường." },
      { status: 503 }
    );
  }

  const to = session.user.email;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px;">
      <div style="background:#1e40af;border-radius:10px 10px 0 0;padding:20px 24px;text-align:center;">
        <span style="font-size:20px;font-weight:800;color:#fff;">⏱ Timio</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border-radius:0 0 10px 10px;">
        <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">✅ Email hoạt động!</h2>
        <p style="margin:0 0 8px;color:#6b7280;font-size:14px;">
          Cấu hình SMTP của Timio đang hoạt động bình thường. Email thông báo sẽ được gửi đúng địa chỉ.
        </p>
        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Gửi đến: <strong>${to}</strong></p>
      </div>
    </div>
  `;

  try {
    await sendEmail({ to, subject: "✅ Timio: Email kiểm tra — cấu hình SMTP hoạt động", html });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gửi thất bại — kiểm tra lại cấu hình SMTP." }, { status: 500 });
  }
}
