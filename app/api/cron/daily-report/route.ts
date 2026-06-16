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

  return NextResponse.json({ ok: true, branches: branches.length });
}
