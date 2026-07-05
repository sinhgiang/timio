import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runLateReminders, sanitizeLateReminderConfig } from "@/lib/lateReminder";

// Chạy mỗi ~10 phút (GitHub Actions). Rà từng nhân viên: quá giờ vào ca + ân hạn + delay mà
// chưa check-in → gửi nhắc riêng. Bỏ qua người nghỉ phép / ngày nghỉ; chỉ nhắc 1 lần/người/ngày.
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { lateReminderConfig: { not: null } },
    select: { id: true, lateReminderConfig: true },
  });

  const fired: Array<{ companyId: string; due: number; email: number; zalo: number; telegramGroups: number }> = [];

  for (const c of companies) {
    let cfg;
    try {
      cfg = sanitizeLateReminderConfig(JSON.parse(c.lateReminderConfig as string));
    } catch {
      continue;
    }
    if (!cfg.enabled) continue;
    const r = await runLateReminders(c.id, cfg);
    if (r.due > 0) {
      fired.push({ companyId: c.id, due: r.due, email: r.emailSent, zalo: r.zaloSent, telegramGroups: r.telegramGroups.length });
    }
  }

  return NextResponse.json({ ok: true, companiesFired: fired.length, fired });
}
