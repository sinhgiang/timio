import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runLateReminders, runPreShiftReminders, sanitizeLateReminderConfig } from "@/lib/lateReminder";

// Chạy mỗi ~10 phút (GitHub Actions). Rà từng nhân viên theo 2 chiều:
//  - TRƯỚC giờ vào ca (beforeShift): còn N phút tới giờ vào ca mà chưa check-in → nhắc sớm.
//  - TRỄ giờ vào ca (enabled): quá giờ vào ca + ân hạn + delay mà chưa check-in → nhắc trễ.
// Bỏ qua người nghỉ phép / ngày nghỉ; mỗi loại chỉ nhắc 1 lần/người/ngày (2 loại tách bảng riêng).
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { lateReminderConfig: { not: null } },
    select: { id: true, lateReminderConfig: true },
  });

  const fired: Array<{ companyId: string; kind: "before" | "late"; due: number; email: number; zalo: number; telegramGroups: number }> = [];
  const failed: Array<{ companyId: string; kind: "before" | "late"; error: string }> = [];

  for (const c of companies) {
    let cfg;
    try {
      cfg = sanitizeLateReminderConfig(JSON.parse(c.lateReminderConfig as string));
    } catch {
      continue;
    }

    // Mỗi công ty/loại nhắc tách try/catch riêng — 1 công ty lỗi (vd bảng mới chưa kịp migrate)
    // không được làm rớt cả vòng lặp, ảnh hưởng tới nhắc trễ của công ty khác.
    if (cfg.beforeShift.enabled) {
      try {
        const rb = await runPreShiftReminders(c.id, cfg);
        if (rb.due > 0) {
          fired.push({ companyId: c.id, kind: "before", due: rb.due, email: rb.emailSent, zalo: rb.zaloSent, telegramGroups: rb.telegramGroups.length });
        }
      } catch (err) {
        failed.push({ companyId: c.id, kind: "before", error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (cfg.enabled) {
      try {
        const rl = await runLateReminders(c.id, cfg);
        if (rl.due > 0) {
          fired.push({ companyId: c.id, kind: "late", due: rl.due, email: rl.emailSent, zalo: rl.zaloSent, telegramGroups: rl.telegramGroups.length });
        }
      } catch (err) {
        failed.push({ companyId: c.id, kind: "late", error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  return NextResponse.json({ ok: true, companiesFired: fired.length, fired, failed });
}
