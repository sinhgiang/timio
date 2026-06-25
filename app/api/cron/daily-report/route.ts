import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegram, buildDailyReport } from "@/lib/telegram";
import { getTodayString } from "@/lib/utils";

// Called by Vercel Cron or manual trigger — no session auth, use secret header
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = getTodayString();
  const todayDate = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

  // Get all branches with a telegramChatId and their company's bot token
  const branches = await prisma.branch.findMany({
    where: { telegramChatId: { not: null } },
    include: {
      company: { select: { telegramBotToken: true } },
      employees: { where: { status: "active" }, select: { id: true } },
    },
  });

  for (const branch of branches) {
    if (!branch.telegramChatId || !branch.company.telegramBotToken) continue;

    const employeeIds = branch.employees.map((e) => e.id);
    const logs = await prisma.attendanceLog.findMany({
      where: { branchId: branch.id, date: today },
    });

    const onTime = logs.filter((l) => l.status === "on_time").length;
    const late = logs.filter((l) => l.status === "late" || l.status === "very_late").length;
    const checkedIn = logs.filter((l) => l.checkInAt).length;
    const notYet = employeeIds.length - checkedIn;

    const message = buildDailyReport({
      branchName: branch.name,
      date: todayDate,
      total: employeeIds.length,
      onTime,
      late,
      notYet,
    });

    await sendTelegram(branch.company.telegramBotToken, branch.telegramChatId, message);
  }

  // Thông báo hợp đồng sắp hết hạn (chạy 1 lần/ngày)
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30Str = in30Days.toISOString().slice(0, 10);

  const expiringContracts = await prisma.contract.findMany({
    where: {
      endDate: { not: null, lte: in30Str, gte: today },
    },
    include: {
      employee: {
        select: {
          name: true, code: true,
          company: { select: { telegramBotToken: true, accountingChatId: true, name: true } },
        },
      },
    },
  });

  // Nhóm theo công ty
  const byCompany = new Map<string, typeof expiringContracts>();
  for (const c of expiringContracts) {
    const companyName = c.employee.company.name;
    if (!byCompany.has(companyName)) byCompany.set(companyName, []);
    byCompany.get(companyName)!.push(c);
  }

  for (const contracts of Array.from(byCompany.values())) {
    const first = contracts[0];
    const { telegramBotToken, accountingChatId } = first.employee.company;
    if (!telegramBotToken || !accountingChatId) continue;

    const lines = contracts.map((c: typeof expiringContracts[0]) => {
      const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - new Date().getTime()) / 86400000);
      return `• ${c.employee.name} (${c.employee.code}) — còn ${daysLeft} ngày (${c.endDate})`;
    });

    const msg = `⚠️ *Hợp đồng sắp hết hạn*\n\nCác nhân viên sau cần ký gia hạn trong 30 ngày tới:\n\n${lines.join("\n")}`;
    await sendTelegram(telegramBotToken, accountingChatId, msg);
  }

  return NextResponse.json({ ok: true, branches: branches.length, expiringContracts: expiringContracts.length });
}
