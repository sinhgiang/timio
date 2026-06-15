import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { leaveRequestEmail } from "@/lib/emailTemplates";

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

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: bodyCompanyId },
      select: { id: true, name: true, department: true },
    });
    if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        companyId: bodyCompanyId,
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
      companyId: bodyCompanyId,
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
  const admin = await prisma.admin.findFirst({
    where: { companyId: opts.companyId, role: "admin" },
    select: { email: true, name: true },
  });
  if (!admin) return;

  const siteUrl = process.env.NEXTAUTH_URL ?? "https://timio.vn";
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
      dashboardUrl: `${siteUrl}/dashboard/leave`,
    }),
  });
}
