import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const scopedBranchId = user?.role === "manager" && user?.branchId ? user.branchId : null;

    const requests = await prisma.overtimeRequest.findMany({
      where: {
        companyId,
        ...(status && status !== "all" ? { status } : {}),
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/overtime-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, date, startTime, endTime, hours, reason } = body;

    if (!employeeId || !date || !startTime || !endTime || hours === undefined) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Derive companyId from the employee record — never trust the request body
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

    const request = await prisma.overtimeRequest.create({
      data: {
        companyId: employee.companyId,
        employeeId,
        date,
        startTime,
        endTime,
        hours: Number(hours),
        reason: reason ?? null,
        status: "pending",
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("POST /api/overtime-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
