import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { leaveRequestEmail } from "@/lib/emailTemplates";
import { sendZaloMessage } from "@/lib/zalo";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const where = { companyId, ...(status ? { status } : {}) };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, companyId: bodyCompanyId, type, fromDate, toDate, days, reason, handoverEmployeeId, employeeSignature } = body;

    if (!employeeId || !type || !fromDate || !toDate || !days) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    // Derive companyId from the employee record — never trust the request body
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId },
      select: { id: true, name: true, department: true, companyId: true },
    });
    if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
    const companyId = employee.companyId;

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        companyId,
        type,
        fromDate,
        toDate,
        days: Number(days),
        reason: reason ?? null,
        handoverEmployeeId: handoverEmployeeId ?? null,
        employeeSignature: employeeSignature ?? null,
        status: "pending",
      },
    });

    // Gửi email thông báo cho admin — fire-and-forget
    void notifyAdminNewLeave({
      companyId,
      employeeName: employee.name,
      department: employee.department ?? "",
      type,
      fromDate,
      toDate,
      days: Number(days),
      reason: reason ?? "",
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Leave request error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

async function notifyAdminNewLeave(opts: {
  companyId: string;
  employeeName: string;
  department: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
}) {
  const [admins, company] = await Promise.all([
    prisma.admin.findMany({
      where: { companyId: opts.companyId },
      select: { email: true, name: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true },
    }),
    prisma.company.findUnique({
      where: { id: opts.companyId },
      select: { telegramBotToken: true, zaloOaToken: true },
    }),
  ]);

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://timio.vn";
  const dashboardUrl = `${siteUrl}/dashboard/leave`;
  const typeLabel: Record<string, string> = { annual: "Nghỉ phép năm", sick: "Nghỉ ốm", unpaid: "Nghỉ không lương", maternity: "Thai sản", other: "Khác" };

  await Promise.all(
    admins.map(async (admin) => {
      // Email notification
      if (admin.receiveLeaveEmail) {
        await sendEmail({
          to: admin.email,
          subject: `📋 ${opts.employeeName} vừa gửi đơn xin nghỉ`,
          html: leaveRequestEmail({
            adminName: admin.name,
            employeeName: opts.employeeName,
            department: opts.department,
            type: opts.type,
            fromDate: opts.fromDate,
            toDate: opts.toDate,
            days: opts.days,
            reason: opts.reason,
            dashboardUrl,
          }),
        });
      }

      // Telegram notification
      if (admin.receiveTelegram && admin.telegramChatId && company?.telegramBotToken) {
        const text = [
          `📋 *Đơn xin nghỉ mới*`,
          `👤 *${opts.employeeName}*${opts.department ? ` — ${opts.department}` : ""}`,
          `📅 ${opts.fromDate} → ${opts.toDate} (${opts.days} ngày)`,
          `🏷 ${typeLabel[opts.type] ?? opts.type}`,
          opts.reason ? `📝 ${opts.reason.slice(0, 200)}` : "",
          `\n[Xem & duyệt](${dashboardUrl})`,
        ].filter(Boolean).join("\n");

        await fetch(`https://api.telegram.org/bot${company.telegramBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: admin.telegramChatId, text, parse_mode: "Markdown" }),
        }).catch((e) => console.error("[telegram] Gửi thất bại:", e));
      }

      // Zalo notification
      if (admin.receiveZalo && admin.zaloUserId && company?.zaloOaToken) {
        const zaloText = [
          `📋 Đơn xin nghỉ mới`,
          `👤 ${opts.employeeName}${opts.department ? ` — ${opts.department}` : ""}`,
          `📅 ${opts.fromDate} → ${opts.toDate} (${opts.days} ngày)`,
          `🏷 ${typeLabel[opts.type] ?? opts.type}`,
          opts.reason ? `📝 ${opts.reason.slice(0, 200)}` : "",
          `\nXem & duyệt: ${dashboardUrl}`,
        ].filter(Boolean).join("\n");

        await sendZaloMessage({ oaToken: company.zaloOaToken, userId: admin.zaloUserId, text: zaloText });
      }
    })
  );
}
