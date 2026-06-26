import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const mm = String(vnNow.getMonth() + 1).padStart(2, "0");
  const dd = String(vnNow.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;
  const todayDisplay = vnNow.toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  let employees;
  try {
    // Fetch all employees with dateOfBirth set, filter by today's MM-DD in JS
    employees = await prisma.employee.findMany({
      where: { status: "active", dateOfBirth: { not: null } },
      select: {
        id: true, name: true, code: true, department: true, dateOfBirth: true,
        branch: {
          select: {
            name: true, telegramChatId: true,
            company: {
              select: {
                name: true, telegramBotToken: true, accountingChatId: true,
                admins: { select: { receiveTelegram: true, telegramChatId: true } },
              },
            },
          },
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }

  // Filter to employees whose birthday is today (MM-DD match)
  const birthdays = employees.filter((e) => e.dateOfBirth?.slice(5) === mmdd);

  if (birthdays.length === 0) {
    return NextResponse.json({ ok: true, count: 0, date: todayDisplay });
  }

  // Group by company to avoid duplicate alerts
  const sentTokens = new Set<string>();
  let alertsSent = 0;

  for (const emp of birthdays) {
    const company = emp.branch.company;
    const token = company.telegramBotToken;
    if (!token) continue;

    const birthYear = emp.dateOfBirth?.slice(0, 4);
    const age = birthYear ? vnNow.getFullYear() - parseInt(birthYear) : null;

    const msg =
      `🎂 <b>Sinh nhật hôm nay!</b>\n` +
      `👤 ${emp.name}${emp.department ? ` (${emp.department})` : ""} — ${emp.code}\n` +
      `🏢 ${emp.branch.name} — ${company.name}\n` +
      (age ? `🎈 Tròn <b>${age} tuổi</b>\n` : "") +
      `📅 ${todayDisplay}\n\n` +
      `<i>Hãy gửi lời chúc đến nhân viên nhé! 🎉</i>`;

    // Branch Telegram
    if (emp.branch.telegramChatId) {
      const key = `${token}:${emp.branch.telegramChatId}:${emp.id}`;
      if (!sentTokens.has(key)) {
        await sendTelegram(token, emp.branch.telegramChatId, msg).catch(() => null);
        sentTokens.add(key);
        alertsSent++;
      }
    }

    // Accounting Telegram
    if (company.accountingChatId && company.accountingChatId !== emp.branch.telegramChatId) {
      const key = `${token}:${company.accountingChatId}:${emp.id}`;
      if (!sentTokens.has(key)) {
        await sendTelegram(token, company.accountingChatId, msg).catch(() => null);
        sentTokens.add(key);
      }
    }

    // Admins' personal Telegram
    for (const admin of company.admins) {
      if (admin.receiveTelegram && admin.telegramChatId) {
        const key = `${token}:${admin.telegramChatId}:${emp.id}`;
        if (!sentTokens.has(key)) {
          await sendTelegram(token, admin.telegramChatId, msg).catch(() => null);
          sentTokens.add(key);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    count: birthdays.length,
    names: birthdays.map((e) => e.name),
    alertsSent,
    date: todayDisplay,
  });
}
