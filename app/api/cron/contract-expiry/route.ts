import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  probation: "Thử việc",
  fixed_term: "Có thời hạn",
  indefinite: "Không thời hạn",
  seasonal: "Thời vụ",
  part_time: "Bán thời gian",
};

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayStr = vnNow.toISOString().slice(0, 10);

  // Alert for contracts expiring in 7 days, 14 days, and 30 days
  const in7 = new Date(vnNow); in7.setDate(in7.getDate() + 7);
  const in14 = new Date(vnNow); in14.setDate(in14.getDate() + 14);
  const in30 = new Date(vnNow); in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().slice(0, 10);

  let contracts;
  try {
    contracts = await prisma.contract.findMany({
      where: {
        endDate: { not: null, gte: todayStr, lte: in30Str },
        employee: { status: "active" },
      },
      select: {
        id: true, type: true, endDate: true,
        employee: {
          select: {
            name: true, code: true, department: true,
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
        },
      },
      orderBy: { endDate: "asc" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }

  if (contracts.length === 0) {
    return NextResponse.json({ ok: true, count: 0, today: todayStr });
  }

  // Group by company to build one message per company
  const byCompany = new Map<string, typeof contracts>();
  for (const c of contracts) {
    const cid = c.employee.branch.company.name;
    if (!byCompany.has(cid)) byCompany.set(cid, []);
    byCompany.get(cid)!.push(c);
  }

  let alertsSent = 0;

  for (const group of Array.from(byCompany.values())) {
    const company = group[0].employee.branch.company;
    const token = company.telegramBotToken;
    if (!token) continue;

    const lines = group.map((c: typeof contracts[0]) => {
      const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - vnNow.getTime()) / 86400000);
      const urgency = daysLeft <= 7 ? "🔴" : daysLeft <= 14 ? "🟠" : "🟡";
      const endDisplay = c.endDate!.split("-").reverse().join("/");
      return `${urgency} <b>${c.employee.name}</b>${c.employee.department ? ` (${c.employee.department})` : ""} — ${CONTRACT_TYPE_LABEL[c.type] ?? c.type}\n   📅 Hết hạn: ${endDisplay} (còn ${daysLeft} ngày)`;
    }).join("\n");

    const msg =
      `📄 <b>Hợp đồng sắp hết hạn</b>\n` +
      `🏢 ${company.name}\n\n` +
      `${lines}\n\n` +
      `🔴 ≤7 ngày  🟠 ≤14 ngày  🟡 ≤30 ngày\n` +
      `<i>Timio — Nhắc nhở tự động hàng tuần</i>`;

    const sentChats = new Set<string>();

    // Branch chats (unique per branch)
    for (const c of group) {
      const chatId = c.employee.branch.telegramChatId;
      if (chatId && !sentChats.has(chatId)) {
        await sendTelegram(token, chatId, msg).catch(() => null);
        sentChats.add(chatId);
        alertsSent++;
      }
    }

    // Accounting chat
    if (company.accountingChatId && !sentChats.has(company.accountingChatId)) {
      await sendTelegram(token, company.accountingChatId, msg).catch(() => null);
      sentChats.add(company.accountingChatId);
    }

    // Individual admins
    for (const admin of company.admins) {
      if (admin.receiveTelegram && admin.telegramChatId && !sentChats.has(admin.telegramChatId)) {
        await sendTelegram(token, admin.telegramChatId, msg).catch(() => null);
        sentChats.add(admin.telegramChatId);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    count: contracts.length,
    alertsSent,
    today: todayStr,
    contracts: contracts.map((c) => ({
      employee: c.employee.name,
      endDate: c.endDate,
      type: c.type,
    })),
  });
}
