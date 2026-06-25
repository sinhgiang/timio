import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  welcomeEmail,
  adminNewSignupEmail,
  customerPaymentConfirmEmail,
  adminPaymentNotifyEmail,
  contractExpiryEmail,
} from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  // Allow both: session auth (from dashboard) OR CRON_SECRET bearer (for CLI/testing)
  const authHeader = req.headers.get("authorization");
  const isCronAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let to: string;
  let companyName: string;
  let slug: string;

  if (isCronAuth) {
    // Called via bearer token — send to override email or ADMIN_NOTIFY_EMAIL
    const body = await req.json().catch(() => ({})) as { to?: string };
    to = body.to ?? process.env.ADMIN_NOTIFY_EMAIL ?? "";
    if (!to) return NextResponse.json({ error: "ADMIN_NOTIFY_EMAIL not set" }, { status: 503 });
    companyName = "Demo Company";
    slug = "demo";
  } else {
    // Called from dashboard — use session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const company = await prisma.company.findFirst({
      where: { admins: { some: { email: session.user.email } } },
      select: { name: true, slug: true, plan: true },
    });
    to = session.user.email;
    companyName = company?.name ?? "Demo Company";
    slug = company?.slug ?? "demo";
  }
  const now = new Date();
  const expiry = new Date(now);
  expiry.setMonth(expiry.getMonth() + 1);

  const results: { type: string; status: string; error?: string }[] = [];

  const jobs: { type: string; to: string; subject: string; html: string }[] = [
    {
      type: "1. Welcome (gửi cho khách mới đăng ký)",
      to,
      subject: `Chào mừng ${companyName} đến với Timio!`,
      html: welcomeEmail({ adminName: companyName, companyName, slug }),
    },
    {
      type: "2. Admin signup (gửi cho admin khi có khách đăng ký)",
      to,
      subject: `🆕 Timio: ${companyName} vừa đăng ký miễn phí`,
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
      subject: `✅ Thanh toán thành công — Gói Pro Timio`,
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
      subject: `💰 Timio: ${companyName} vừa mua gói Pro`,
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
    {
      type: "5. Contract expiry (gửi khi nhân viên sắp hết hợp đồng)",
      to,
      subject: `⚠️ 2 hợp đồng sắp hết hạn — ${companyName}`,
      html: contractExpiryEmail({
        companyName,
        contracts: [
          { name: "Nguyễn Văn An", code: "NV001", endDate: "2026-07-15", daysLeft: 20 },
          { name: "Trần Thị Bình", code: "NV002", endDate: "2026-07-25", daysLeft: 5 },
        ],
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
