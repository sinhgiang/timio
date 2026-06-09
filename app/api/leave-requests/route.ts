import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { employeeId, companyId: bodyCompanyId, type, fromDate, toDate, days, reason } = body;

    if (!employeeId || !type || !fromDate || !toDate || !days) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    // Verify employee belongs to this company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: bodyCompanyId },
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
        status: "pending",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Leave request error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
