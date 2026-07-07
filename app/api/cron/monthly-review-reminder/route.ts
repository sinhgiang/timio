import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron chạy đầu tháng: nhắc admin/quản lý đánh giá phát triển nhân viên tháng này.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Chỉ nhắc công ty gói Business (có tính năng đánh giá phát triển)
  const companies = await prisma.company.findMany({
    where: { plan: "business" },
    select: {
      id: true, name: true, logoUrl: true,
      admins: { where: { role: { in: ["owner", "manager"] }, receiveLeaveEmail: true }, select: { email: true, name: true } },
      _count: { select: { employees: true } },
    },
  });

  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const monthLabel = `tháng ${vnNow.getMonth() + 1}/${vnNow.getFullYear()}`;

  let sent = 0;
  for (const c of companies) {
    if (c._count.employees === 0) continue;
    const recipients = Array.from(new Set(c.admins.map((a) => a.email).filter(Boolean)));
    if (recipients.length === 0) continue;
    const head = c.logoUrl
      ? `<div style="text-align:center;margin-bottom:16px"><img src="${c.logoUrl}" style="max-height:48px;max-width:160px"></div>`
      : `<div style="font-weight:bold;font-size:18px;color:#111827;margin-bottom:12px">${c.name}</div>`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
      ${head}
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào anh/chị,</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Đến kỳ <b>đánh giá phát triển nhân viên ${monthLabel}</b>. Chỉ mất vài phút để chấm: thái độ, chất lượng công việc, sự tiến bộ, sáng tạo — giúp bạn theo dõi ai đang lên, ai cần hỗ trợ, và ai xứng đáng thăng chức.</p>
      <p style="text-align:center;margin:22px 0"><a href="https://timio.vn/dashboard/performance-reviews" style="background:#059669;color:#fff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">Đánh giá nhân viên tháng này →</a></p>
      <p style="font-size:12px;color:#9ca3af;margin:0">Lịch sử đánh giá được lưu lại thành lộ trình phát triển của từng nhân viên. Timio.</p>
    </div>`;
    try {
      await sendEmail({ to: recipients.join(","), subject: `Nhắc đánh giá phát triển nhân viên ${monthLabel} — ${c.name}`, html });
      sent++;
    } catch (e) {
      console.error("[cron/monthly-review-reminder]", c.id, e);
    }
  }

  return NextResponse.json({ ok: true, companiesReminded: sent });
}
