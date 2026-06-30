import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { leaveRequestEmail } from "@/lib/emailTemplates";
import { sendZaloMessage } from "@/lib/zalo";
import { sendTelegram } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scopedBranchId = user?.role === "manager" && user?.branchId ? user.branchId : null;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const fromDate = req.nextUrl.searchParams.get("fromDate") ?? undefined;
  const toDate = req.nextUrl.searchParams.get("toDate") ?? undefined;
  const where = {
    companyId,
    ...(status && status !== "all" ? { status } : status === "all" ? { status: { in: ["pending", "approved", "rejected"] as string[] } } : {}),
    ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
    ...(fromDate && toDate ? { fromDate: { lte: toDate }, toDate: { gte: fromDate } } : {}),
  };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { id: true, name: true, code: true, department: true, position: true, phone: true, dateOfBirth: true, annualLeaveBalance: true, baseSalary: true, branch: { select: { name: true } } } } },
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
      employeeId,
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
  employeeId: string;
  employeeName: string;
  department: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
}) {
  const [admins, company, employee] = await Promise.all([
    prisma.admin.findMany({
      where: { companyId: opts.companyId },
      select: { email: true, name: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true },
    }),
    prisma.company.findUnique({
      where: { id: opts.companyId },
      select: { telegramBotToken: true, zaloOaToken: true, accountingChatId: true },
    }),
    prisma.employee.findUnique({
      where: { id: opts.employeeId },
      select: { branch: { select: { telegramChatId: true, name: true } } },
    }),
  ]);

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://timio.vn";
  const dashboardUrl = `${siteUrl}/dashboard/leave`;
  const typeLabel: Record<string, string> = { annual: "Nghỉ phép năm", sick: "Nghỉ ốm", unpaid: "Nghỉ không lương", maternity: "Thai sản", other: "Khác", wedding: "Nghỉ cưới", funeral: "Nghỉ tang", paternity: "Nghỉ con sinh" };

  const token = company?.telegramBotToken;
  const tgMsg =
    `📋 <b>Đơn xin nghỉ mới</b>\n` +
    `👤 <b>${opts.employeeName}</b>${opts.department ? ` — ${opts.department}` : ""}` +
    (employee?.branch?.name ? ` | ${employee.branch.name}` : "") + "\n" +
    `📅 ${opts.fromDate} → ${opts.toDate} (${opts.days} ngày)\n` +
    `🏷 ${typeLabel[opts.type] ?? opts.type}\n` +
    (opts.reason ? `📝 ${opts.reason.slice(0, 200)}\n` : "") +
    `\n<a href="${dashboardUrl}">Xem &amp; duyệt trên Timio →</a>`;

  // Gửi Telegram tới branch chat + accounting chat + admin cá nhân
  const sentChats = new Set<string>();
  if (token) {
    const branchChatId = employee?.branch?.telegramChatId;
    if (branchChatId) {
      await sendTelegram(token, branchChatId, tgMsg).catch(() => null);
      sentChats.add(branchChatId);
    }
    if (company?.accountingChatId && !sentChats.has(company.accountingChatId)) {
      await sendTelegram(token, company.accountingChatId, tgMsg).catch(() => null);
      sentChats.add(company.accountingChatId);
    }
  }

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

      // Telegram cá nhân admin
      if (token && admin.receiveTelegram && admin.telegramChatId && !sentChats.has(admin.telegramChatId)) {
        await sendTelegram(token, admin.telegramChatId, tgMsg).catch(() => null);
        sentChats.add(admin.telegramChatId);
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
