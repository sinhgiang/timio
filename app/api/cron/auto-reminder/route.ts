import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCompanyReminder, sanitizeReminderConfig } from "@/lib/reminderSend";

// Chạy mỗi giờ (vercel.json: "0 * * * *"). Khớp giờ + thứ trong config của từng công ty.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Giờ + thứ theo giờ Việt Nam (UTC+7)
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const hour = nowVN.getUTCHours();
  const weekday = nowVN.getUTCDay(); // 0=CN .. 6=Thứ 7

  const companies = await prisma.company.findMany({
    where: { autoReminderConfig: { not: null } },
    select: { id: true, autoReminderConfig: true },
  });

  const sent: { companyId: string; matched: number; email: number; telegram: number; zalo: number }[] = [];

  for (const c of companies) {
    let cfg;
    try {
      cfg = sanitizeReminderConfig(JSON.parse(c.autoReminderConfig as string));
    } catch {
      continue;
    }
    if (!cfg.enabled) continue;
    if (!cfg.times.includes(hour)) continue;
    if (!cfg.days.includes(weekday)) continue;
    if (!cfg.channels.email && !cfg.channels.telegram && !cfg.channels.zalo) continue;

    const r = await sendCompanyReminder({
      companyId: c.id,
      target: cfg.target,
      subject: cfg.subject,
      message: cfg.message,
      channels: cfg.channels,
    });
    sent.push({ companyId: c.id, matched: r.matched, email: r.emailSent, telegram: r.telegramSent, zalo: r.zaloSent });
  }

  return NextResponse.json({ ok: true, hourVN: hour, weekdayVN: weekday, companiesFired: sent.length, sent });
}
