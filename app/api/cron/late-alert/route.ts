import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // VN time (UTC+7)
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const today = vnNow.toISOString().slice(0, 10);
  const jsDay = vnNow.getDay(); // 0=Sun, 1=Mon..6=Sat
  const vnDay = jsDay === 0 ? 7 : jsDay; // branch workDays: 1=Mon..7=Sun
  const currentMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();
  const todayDisplay = vnNow.toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  let alertsSent = 0;

  const branches = await prisma.branch.findMany({
    include: {
      company: {
        select: {
          name: true,
          telegramBotToken: true,
          accountingChatId: true,
          admins: {
            select: { receiveTelegram: true, telegramChatId: true },
          },
        },
      },
      employees: {
        where: { status: "active" },
        select: { id: true, name: true, code: true, department: true },
      },
    },
  });

  for (const branch of branches) {
    // Check if today is a work day for this branch
    const workDays = branch.workDays?.split(",").map(Number) ?? [1, 2, 3, 4, 5];
    if (!workDays.includes(vnDay)) continue;
    if (branch.employees.length === 0) continue;

    // Alert threshold: checkInTime + gracePeriod + 30 min buffer
    const [ciH, ciM] = branch.checkInTime.split(":").map(Number);
    const alertThreshold = ciH * 60 + ciM + (branch.gracePeriod ?? 5) + 30;
    if (currentMinutes < alertThreshold) continue;

    // Find employees who haven't checked in
    const logs = await prisma.attendanceLog.findMany({
      where: { branchId: branch.id, date: today, checkInAt: { not: null } },
      select: { employeeId: true },
    });
    const checkedInIds = new Set(logs.map((l) => l.employeeId));
    const absent = branch.employees.filter((e) => !checkedInIds.has(e.id));
    if (absent.length === 0) continue;

    const names = absent
      .map((e) => `• ${e.name}${e.department ? ` (${e.department})` : ""} — ${e.code}`)
      .join("\n");

    const msg =
      `⚠️ *Cảnh báo chưa chấm công*\n` +
      `🏢 ${branch.name} — ${branch.company.name}\n` +
      `📅 ${todayDisplay} | Ca: ${branch.checkInTime}\n\n` +
      `Chưa vào làm (${absent.length}/${branch.employees.length} NV):\n${names}\n\n` +
      `_Timio — Cảnh báo tự động_`;

    const token = branch.company.telegramBotToken;

    // Branch Telegram
    if (branch.telegramChatId && token) {
      await sendTelegram(token, branch.telegramChatId, msg).catch(() => null);
      alertsSent++;
    }

    // Company accounting Telegram (nếu khác branch chatId)
    if (
      token &&
      branch.company.accountingChatId &&
      branch.company.accountingChatId !== branch.telegramChatId
    ) {
      await sendTelegram(token, branch.company.accountingChatId, msg).catch(() => null);
    }

    // Admins' personal Telegram
    for (const admin of branch.company.admins) {
      if (token && admin.receiveTelegram && admin.telegramChatId) {
        await sendTelegram(token, admin.telegramChatId, msg).catch(() => null);
      }
    }
  }

  return NextResponse.json({ ok: true, alertsSent, today });
}
