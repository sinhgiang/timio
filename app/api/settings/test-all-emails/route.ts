import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  welcomeEmail,
  adminNewSignupEmail,
  customerPaymentConfirmEmail,
  adminPaymentNotifyEmail,
} from "@/lib/emailTemplates";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await prisma.company.findFirst({
    where: { admins: { some: { email: session.user.email } } },
    select: { name: true, slug: true, plan: true },
  });

  const to = session.user.email;
  const companyName = company?.name ?? "Demo Company";
  const slug = company?.slug ?? "demo";
  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + 1);

  const results: { type: string; status: string; error?: string }[] = [];

  const jobs: { type: string; to: string; subject: string; html: string }[] = [
    {
      type: "1. Welcome (gửi cho khách mới đăng ký)",
      to,
      subject: `[TEST] Chào mừng ${companyName} đến với Timio!`,
      html: welcomeEmail({ adminName: companyName, companyName, slug }),
    },
    {
      type: "2. Admin signup (gửi cho admin khi có khách đăng ký)",
      to,
      subject: `[TEST] 🆕 Timio: ${companyName} vừa đăng ký miễn phí`,
      html: adminNewSignupEmail({
        companyName,
        companySlug: slug,
        email: to,
        referralCode: null,
        affiliateCode: null,
      }),
    },
    {
      type: "3. Payment confirm (gửi cho khách khi mua Pro/Business)",
      to,
      subject: `[TEST] ✅ Thanh toán thành công — Gói Pro Timio`,
      html: customerPaymentConfirmEmail({
        adminName: companyName,
        companyName,
        planLabel: "Pro",
        planPrice: 299000,
        months: 1,
        newExpiry: expiry,
      }),
    },
    {
      type: "4. Admin payment (gửi cho admin khi có đơn mua)",
      to,
      subject: `[TEST] 💰 Timio: ${companyName} vừa mua gói Pro`,
      html: adminPaymentNotifyEmail({
        companyName,
        companySlug: slug,
        planLabel: "Pro",
        planPrice: 299000,
        months: 1,
        affiliateCode: null,
        affiliateName: null,
        newExpiry: expiry,
      }),
    },
  ];

  for (const job of jobs) {
    try {
      await sendEmail({ to: job.to, subject: job.subject, html: job.html });
      results.push({ type: job.type, status: "✅ Gửi thành công" });
    } catch (err) {
      results.push({ type: job.type, status: "❌ Lỗi", error: String(err) });
    }
  }

  return NextResponse.json({ results, sentTo: to });
}
