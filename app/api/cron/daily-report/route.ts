import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram, buildDailyReport, buildDailyReportText } from "@/lib/telegram";
import { sendZaloMessage, getValidOaToken } from "@/lib/zalo";
import { sendEmail } from "@/lib/email";
import { contractExpiryEmail, dailyReportEmail } from "@/lib/emailTemplates";
import { getTodayString } from "@/lib/utils";

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayString();
  const todayDate = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  });

  // ── 1. Báo cáo điểm danh hàng ngày — Telegram (chi nhánh) + Email/Zalo (admin) ──
  let dailyTelegram = 0;
  let dailyEmail = 0;
  let dailyZalo = 0;

  const reportCompanies = await prisma.company.findMany({
    where: { employees: { some: { status: "active" } } },
    select: {
      id: true, name: true,
      telegramBotToken: true,
      zaloOaToken: true, zaloAppId: true, zaloSecretKey: true,
      zaloRefreshToken: true, zaloTokenExpiresAt: true,
      branches: {
        select: {
          id: true, name: true, telegramChatId: true,
          employees: { where: { status: "active" }, select: { id: true } },
        },
      },
      admins: {
        where: { receiveDailyReport: true },
        select: { email: true, branchId: true, zaloUserId: true },
      },
    },
  });

  for (const company of reportCompanies) {
    // Tính thống kê từng chi nhánh
    const branchStats = new Map<string, { name: string; total: number; onTime: number; late: number; notYet: number }>();
    for (const b of company.branches) {
      const logs = await prisma.attendanceLog.findMany({ where: { branchId: b.id, date: today } });
      const onTime = logs.filter((l) => l.status === "on_time").length;
      const late = logs.filter((l) => l.status === "late" || l.status === "very_late").length;
      const checkedIn = logs.filter((l) => l.checkInAt).length;
      const notYet = b.employees.length - checkedIn;
      branchStats.set(b.id, { name: b.name, total: b.employees.length, onTime, late, notYet });

      // Telegram — gửi theo từng chi nhánh có cấu hình chat (giữ hành vi cũ)
      if (b.telegramChatId && company.telegramBotToken) {
        const message = buildDailyReport({ branchName: b.name, date: todayDate, total: b.employees.length, onTime, late, notYet });
        await sendTelegram(company.telegramBotToken, b.telegramChatId, message);
        dailyTelegram++;
      }
    }

    if (company.admins.length === 0) continue;

    // Token Zalo (lấy 1 lần / công ty, chỉ khi có admin nhận qua Zalo)
    let oaToken: string | null = null;
    if (company.admins.some((a) => a.zaloUserId) && (company.zaloOaToken || company.zaloRefreshToken)) {
      oaToken = await getValidOaToken(company);
    }

    for (const admin of company.admins) {
      // Phạm vi: admin gắn 1 chi nhánh → chỉ chi nhánh đó; không gắn → toàn công ty
      const scopeBranches = admin.branchId
        ? [branchStats.get(admin.branchId)].filter((x): x is NonNullable<typeof x> => Boolean(x))
        : Array.from(branchStats.values());
      if (scopeBranches.length === 0) continue;

      const totals = scopeBranches.reduce(
        (acc, b) => ({ total: acc.total + b.total, onTime: acc.onTime + b.onTime, late: acc.late + b.late, notYet: acc.notYet + b.notYet }),
        { total: 0, onTime: 0, late: 0, notYet: 0 }
      );
      const scopeLabel = admin.branchId ? (scopeBranches[0]?.name ?? "Chi nhánh") : "Toàn công ty";

      // Email
      if (admin.email) {
        try {
          await sendEmail({
            to: admin.email,
            subject: `Báo cáo chấm công ${todayDate} — ${company.name}`,
            html: dailyReportEmail({ companyName: company.name, date: todayDate, scopeLabel, totals, branches: scopeBranches }),
          });
          dailyEmail++;
        } catch { /* non-fatal */ }
      }

      // Zalo (chỉ khi admin đã follow OA + có token)
      if (oaToken && admin.zaloUserId) {
        const text = buildDailyReportText({ companyName: company.name, date: todayDate, scopeLabel, ...totals });
        try {
          const res = await sendZaloMessage({ oaToken, userId: admin.zaloUserId, text });
          if (res.ok) dailyZalo++;
        } catch { /* non-fatal */ }
      }
    }
  }

  // ── 2. Hợp đồng sắp hết hạn — Email + Telegram + Zalo ───────────────────
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30Str = in30Days.toISOString().slice(0, 10);

  const expiringContracts = await prisma.contract.findMany({
    where: { endDate: { not: null, lte: in30Str, gte: today } },
    include: {
      employee: {
        select: {
          name: true, code: true,
          company: {
            select: {
              id: true, name: true,
              telegramBotToken: true, accountingChatId: true,
              zaloOaToken: true,
              admins: {
                select: {
                  email: true, name: true,
                  receiveLeaveEmail: true,
                  receiveTelegram: true, telegramChatId: true,
                  receiveZalo: true, zaloUserId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Group by company
  const byCompany = new Map<string, { companyId: string; companyName: string; botToken: string | null; accountingChatId: string | null; zaloOaToken: string | null; admins: typeof expiringContracts[0]["employee"]["company"]["admins"]; contracts: { name: string; code: string; endDate: string; daysLeft: number }[] }>();

  for (const c of expiringContracts) {
    const comp = c.employee.company;
    if (!byCompany.has(comp.id)) {
      byCompany.set(comp.id, {
        companyId: comp.id,
        companyName: comp.name,
        botToken: comp.telegramBotToken,
        accountingChatId: comp.accountingChatId,
        zaloOaToken: comp.zaloOaToken,
        admins: comp.admins,
        contracts: [],
      });
    }
    const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - Date.now()) / 86400000);
    byCompany.get(comp.id)!.contracts.push({
      name: c.employee.name,
      code: c.employee.code,
      endDate: c.endDate!,
      daysLeft,
    });
  }

  let emailsSent = 0;
  let telegramsSent = 0;
  let zalosSent = 0;

  for (const group of Array.from(byCompany.values())) {
    const contractList = group.contracts;
    const summary = contractList.map((c) => `• ${c.name} (${c.code}) — còn ${c.daysLeft} ngày (${c.endDate})`).join("\n");
    const telegramMsg = `⚠️ *Hợp đồng sắp hết hạn*\n\n${group.companyName} có ${contractList.length} hợp đồng hết hạn trong 30 ngày:\n\n${summary}\n\nVào dashboard để gia hạn kịp thời.`;

    // Email — gửi cho tất cả admin có receiveLeaveEmail = true (hoặc không có cờ = mặc định gửi)
    for (const admin of group.admins) {
      if (admin.receiveLeaveEmail === false) continue;
      try {
        await sendEmail({
          to: admin.email,
          subject: `⚠️ ${contractList.length} hợp đồng sắp hết hạn — ${group.companyName}`,
          html: contractExpiryEmail({ companyName: group.companyName, contracts: contractList }),
        });
        emailsSent++;
      } catch { /* non-fatal */ }
    }

    // Telegram — gửi accountingChatId (báo cáo chung) + từng admin có receiveTelegram
    if (group.botToken && group.accountingChatId) {
      try { await sendTelegram(group.botToken, group.accountingChatId, telegramMsg); telegramsSent++; } catch { /* non-fatal */ }
    }
    for (const admin of group.admins) {
      if (!admin.receiveTelegram || !admin.telegramChatId || !group.botToken) continue;
      if (admin.telegramChatId === group.accountingChatId) continue; // đã gửi rồi
      try { await sendTelegram(group.botToken, admin.telegramChatId, telegramMsg); telegramsSent++; } catch { /* non-fatal */ }
    }

    // Zalo — gửi từng admin có receiveZalo = true
    if (group.zaloOaToken) {
      for (const admin of group.admins) {
        if (!admin.receiveZalo || !admin.zaloUserId) continue;
        try {
          await sendZaloMessage({ oaToken: group.zaloOaToken, userId: admin.zaloUserId, text: telegramMsg.replace(/\*/g, "") });
          zalosSent++;
        } catch { /* non-fatal */ }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dailyReport: { telegram: dailyTelegram, email: dailyEmail, zalo: dailyZalo, companies: reportCompanies.length },
    expiringContracts: expiringContracts.length,
    companiesNotified: byCompany.size,
    emailsSent,
    telegramsSent,
    zalosSent,
  });
}
