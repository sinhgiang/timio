import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { dailyReportEmail } from "@/lib/emailTemplates";
import { sendZaloMessage, getValidOaToken } from "@/lib/zalo";
import { buildDailyReportText } from "@/lib/telegram";
import { getTodayString } from "@/lib/utils";

// POST /api/cron/daily-report/test — gửi thử báo cáo chấm công hôm nay cho chính owner
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { companyId?: string; role?: string; email?: string } | undefined) ?? {};
  if (!user.companyId || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Chỉ chủ tài khoản mới gửi thử được" }, { status: 403 });

  const today = getTodayString();
  const todayDate = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      id: true, name: true,
      zaloOaToken: true, zaloAppId: true, zaloSecretKey: true, zaloRefreshToken: true, zaloTokenExpiresAt: true,
      branches: { select: { id: true, name: true, employees: { where: { status: "active" }, select: { id: true } } } },
    },
  });
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  const branchStats = [] as { name: string; total: number; onTime: number; late: number; notYet: number }[];
  for (const b of company.branches) {
    const logs = await prisma.attendanceLog.findMany({ where: { branchId: b.id, date: today } });
    const onTime = logs.filter((l) => l.status === "on_time").length;
    const late = logs.filter((l) => l.status === "late" || l.status === "very_late").length;
    const checkedIn = logs.filter((l) => l.checkInAt).length;
    branchStats.push({ name: b.name, total: b.employees.length, onTime, late, notYet: b.employees.length - checkedIn });
  }
  const totals = branchStats.reduce(
    (acc, b) => ({ total: acc.total + b.total, onTime: acc.onTime + b.onTime, late: acc.late + b.late, notYet: acc.notYet + b.notYet }),
    { total: 0, onTime: 0, late: 0, notYet: 0 }
  );

  const owner = await prisma.admin.findFirst({
    where: { companyId: company.id, email: user.email },
    select: { zaloUserId: true },
  });

  // Email — gửi cho chính owner
  try {
    await sendEmail({
      to: user.email,
      subject: `[Gửi thử] Báo cáo chấm công ${todayDate} — ${company.name}`,
      html: dailyReportEmail({ companyName: company.name, date: todayDate, scopeLabel: "Toàn công ty", totals, branches: branchStats }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Gửi email thất bại: ${err instanceof Error ? err.message : "unknown"}` }, { status: 500 });
  }

  // Zalo (nếu owner đã follow OA + công ty có token)
  let zaloSent = false;
  if (owner?.zaloUserId && (company.zaloOaToken || company.zaloRefreshToken)) {
    const token = await getValidOaToken(company);
    if (token) {
      const text = buildDailyReportText({ companyName: company.name, date: todayDate, scopeLabel: "Toàn công ty", ...totals });
      const res = await sendZaloMessage({ oaToken: token, userId: owner.zaloUserId, text });
      zaloSent = res.ok;
    }
  }

  return NextResponse.json({ ok: true, sentTo: user.email, zaloSent, totals });
}
