import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { status, note } = body as { status: string; note?: string };

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const existing = await prisma.overtimeRequest.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

    if (!(await employeeInScope(user, existing.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    const updated = await prisma.overtimeRequest.update({
      where: { id: params.id },
      data: {
        status,
        note: note ?? null,
      },
      include: {
        employee: { select: { name: true } },
      },
    });

    // When approved: update the AttendanceLog for that date to set overtimeStatus = "approved"
    if (status === "approved") {
      await prisma.attendanceLog.updateMany({
        where: {
          employeeId: existing.employeeId,
          date: existing.date,
        },
        data: { overtimeStatus: "approved" },
      });
    } else if (status === "rejected") {
      // If rejecting a previously-approved request, revert overtimeStatus
      await prisma.attendanceLog.updateMany({
        where: {
          employeeId: existing.employeeId,
          date: existing.date,
          overtimeStatus: "approved",
        },
        data: { overtimeStatus: "rejected" },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/overtime-requests/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.overtimeRequest.findFirst({
      where: { id: params.id, companyId },
      select: { employeeId: true },
    });
    if (existing && !(await employeeInScope(user, existing.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    await prisma.overtimeRequest.deleteMany({
      where: { id: params.id, companyId, status: "pending" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/overtime-requests/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
