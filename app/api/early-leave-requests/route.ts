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

    const requests = await prisma.earlyLeaveRequest.findMany({
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
    console.error("GET /api/early-leave-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, employeeCode, pin, date, leaveTime, reason } = body as {
      employeeId?: string;
      employeeCode?: string;
      pin?: string;
      date?: string;
      leaveTime?: string;
      reason?: string;
    };

    if (!date || !leaveTime) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc (date, leaveTime)" }, { status: 400 });
    }

    let resolvedEmployeeId: string;
    let companyId: string;

    if (employeeId) {
      // Admin creates on behalf
      const session = await getServerSession(authOptions);
      const user = session?.user as { companyId?: string } | undefined;
      if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      companyId = user.companyId;

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        select: { id: true, companyId: true },
      });
      if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
      resolvedEmployeeId = employee.id;
    } else if (employeeCode && pin) {
      // Employee self-service — authenticate by code + PIN
      const employee = await prisma.employee.findFirst({
        where: { code: employeeCode, pin },
        select: { id: true, companyId: true },
      });
      if (!employee) return NextResponse.json({ error: "Mã nhân viên hoặc PIN không đúng" }, { status: 401 });
      resolvedEmployeeId = employee.id;
      companyId = employee.companyId;
    } else {
      return NextResponse.json({ error: "Thiếu thông tin xác thực nhân viên" }, { status: 400 });
    }

    const request = await prisma.earlyLeaveRequest.create({
      data: {
        companyId,
        employeeId: resolvedEmployeeId,
        date,
        leaveTime,
        reason: reason ?? null,
        status: "pending",
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("POST /api/early-leave-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
