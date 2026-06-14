import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram, buildLeaveApprovedAlert } from "@/lib/telegram";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, note } = await req.json();
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const request = await prisma.leaveRequest.findFirst({ where: { id: params.id, companyId } });
  if (!request) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Deduct leave balance if approving annual leave
  if (status === "approved" && request.status === "pending" && request.type === "annual") {
    const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
    if (!employee || employee.annualLeaveBalance < request.days) {
      return NextResponse.json({ error: "Nhân viên không đủ ngày phép năm" }, { status: 400 });
    }
    await prisma.employee.update({
      where: { id: request.employeeId },
      data: { annualLeaveBalance: { decrement: request.days } },
    });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: params.id },
    data: { status, note: note ?? null },
    include: { employee: { select: { name: true } } },
  });

  // Gửi Telegram cho kế toán khi duyệt
  if (status === "approved" && request.status === "pending") {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { telegramBotToken: true, accountingChatId: true },
    });
    if (company?.telegramBotToken && company?.accountingChatId) {
      const TYPE_LABELS: Record<string, string> = {
        annual: "Nghỉ phép năm", sick: "Nghỉ ốm", unpaid: "Nghỉ không lương",
        maternity: "Thai sản", other: "Khác",
      };
      void sendTelegram(
        company.telegramBotToken,
        company.accountingChatId,
        buildLeaveApprovedAlert({
          employeeName: updated.employee.name,
          leaveType: TYPE_LABELS[request.type] ?? request.type,
          fromDate: request.fromDate,
          toDate: request.toDate,
          days: request.days,
          note: note ?? null,
        })
      );
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.leaveRequest.deleteMany({ where: { id: params.id, companyId, status: "pending" } });
  return NextResponse.json({ ok: true });
}
