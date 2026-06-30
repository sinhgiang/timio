import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // VN time (UTC+7)
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayDay = vnNow.getDate();

  // Previous month
  const prevMonth = vnNow.getMonth() === 0 ? 12 : vnNow.getMonth();
  const prevMonthYear = vnNow.getMonth() === 0 ? vnNow.getFullYear() - 1 : vnNow.getFullYear();

  let companies;
  try {
    companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        paydayOfMonth: true,
        telegramBotToken: true,
        accountingChatId: true,
        admins: {
          select: {
            email: true,
            name: true,
            role: true,
          },
        },
        employees: {
          where: { status: "active" },
          select: {
            id: true,
            name: true,
            baseSalary: true,
          },
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }

  let processed = 0;

  for (const company of companies) {
    // Only process companies whose payday is today
    if (company.paydayOfMonth !== todayDay) continue;

    // Fetch salary payments for previous month
    let salaryPayments;
    try {
      salaryPayments = await prisma.salaryPayment.findMany({
        where: {
          companyId: company.id,
          year: prevMonthYear,
          month: prevMonth,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          employee: { select: { name: true } },
        },
        orderBy: { amount: "desc" },
      });
    } catch {
      continue;
    }

    const totalEmployees = company.employees.length;
    const totalAmount = salaryPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidCount = salaryPayments.filter((p) => p.status === "paid").length;
    const totalRecords = salaryPayments.length;

    const fmtVnd = (n: number) =>
      new Intl.NumberFormat("vi-VN").format(n) + "đ";

    const top3 = salaryPayments.slice(0, 3);
    const top3Lines = top3
      .map((p) => `• ${p.employee.name}: ${fmtVnd(p.amount)}`)
      .join("\n");

    const dashboardUrl = `${process.env.NEXTAUTH_URL ?? "https://timio.vn"}/dashboard/salary-payments`;

    // ── Telegram message ──
    if (company.telegramBotToken && company.accountingChatId) {
      const telegramMsg =
        `💰 <b>Báo cáo lương tháng ${String(prevMonth).padStart(2, "0")}/${prevMonthYear}</b>\n` +
        `🏢 ${company.name}\n\n` +
        `👥 Tổng nhân viên: <b>${totalEmployees}</b>\n` +
        `💵 Tổng lương phải trả: <b>${fmtVnd(totalAmount)}</b>\n` +
        `✅ Đã xác nhận: <b>${paidCount}/${totalRecords}</b>\n` +
        (top3.length > 0
          ? `\n🏆 Top ${top3.length} cao nhất:\n${top3Lines}\n`
          : "") +
        `\n🔗 Xem chi tiết: ${dashboardUrl}`;

      void sendTelegram(company.telegramBotToken, company.accountingChatId, telegramMsg);
    }

    // ── Email to owner/admin users ──
    const recipients = company.admins.filter((a) =>
      a.role === "owner" || a.role === "admin"
    );

    const salaryRowsHtml = top3
      .map(
        (p) =>
          `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${p.employee.name}</td>` +
          `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fmtVnd(p.amount)}</td>` +
          `<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${p.status === "paid" ? "✅ Đã trả" : "⏳ Chưa trả"}</td></tr>`
      )
      .join("");

    const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<body style="font-family:sans-serif;color:#222;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#2563eb">💰 Báo cáo lương tháng ${String(prevMonth).padStart(2, "0")}/${prevMonthYear}</h2>
  <p style="color:#555">Công ty: <strong>${company.name}</strong></p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr style="background:#f3f4f6">
      <td style="padding:8px 12px;font-weight:600">Tổng nhân viên</td>
      <td style="padding:8px 12px;text-align:right">${totalEmployees}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-weight:600">Tổng lương phải trả</td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;color:#16a34a">${fmtVnd(totalAmount)}</td>
    </tr>
    <tr style="background:#f3f4f6">
      <td style="padding:8px 12px;font-weight:600">Đã xác nhận</td>
      <td style="padding:8px 12px;text-align:right">${paidCount} / ${totalRecords}</td>
    </tr>
  </table>

  ${
    top3.length > 0
      ? `<h3 style="margin-top:24px">Top ${top3.length} nhân viên lương cao nhất</h3>
  <table style="width:100%;border-collapse:collapse;margin:8px 0">
    <thead>
      <tr style="background:#2563eb;color:#fff">
        <th style="padding:8px 12px;text-align:left">Nhân viên</th>
        <th style="padding:8px 12px;text-align:right">Lương</th>
        <th style="padding:8px 12px;text-align:center">Trạng thái</th>
      </tr>
    </thead>
    <tbody>${salaryRowsHtml}</tbody>
  </table>`
      : ""
  }

  <p style="margin-top:24px">
    <a href="${dashboardUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
      Xem chi tiết thanh toán lương
    </a>
  </p>

  <p style="margin-top:32px;font-size:12px;color:#999">Timio — Hệ thống chấm công tự động</p>
</body>
</html>`;

    for (const admin of recipients) {
      try {
        await sendEmail({
          to: admin.email,
          subject: `[Timio] Báo cáo lương tháng ${String(prevMonth).padStart(2, "0")}/${prevMonthYear} — ${company.name}`,
          html: emailHtml,
        });
      } catch {
        // Non-critical — continue
      }
    }

    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
