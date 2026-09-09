import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";
import { notifyWorkerByEmployee } from "@/lib/workerNotify";
import { recomputeAttendanceLogsForApproval } from "@/lib/approvedException";

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

    const existing = await prisma.earlyLeaveRequest.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu về sớm" }, { status: 404 });

    if (!(await employeeInScope(user, existing.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Chỉ có thể duyệt/từ chối yêu cầu đang chờ" }, { status: 400 });
    }

    const updated = await prisma.earlyLeaveRequest.update({
      where: { id: params.id },
      data: {
        status,
        note: note ?? null,
      },
      include: {
        employee: {
          select: { id: true, name: true, code: true, department: true },
        },
      },
    });

    // Đơn được DUYỆT → tự động sửa lại AttendanceLog nếu NV đã lỡ chấm công TRƯỚC khi sếp duyệt
    // (chấm công SAU khi duyệt đã tự đúng nhờ getApprovedTimeOverride() ở các route check-in —
    // xem lib/approvedException.ts). Không cần sếp vào sửa tay báo cáo nữa.
    if (status === "approved") {
      await recomputeAttendanceLogsForApproval(existing.employeeId, existing.date);
    }

    const isLateArrival = existing.kind === "late_arrival";
    // Báo nhân viên (app nhân viên) — đồng bộ 2 chiều
    notifyWorkerByEmployee(existing.employeeId, {
      type: "generic",
      title: status === "approved"
        ? `Đơn ${isLateArrival ? "đến muộn" : "về sớm"} đã được duyệt`
        : `Đơn ${isLateArrival ? "đến muộn" : "về sớm"} bị từ chối`,
      body: `Ngày ${existing.date}${note ? " · " + note : ""}`,
      link: "requests", email: false,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/early-leave-requests/[id] error:", error);
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

    const existing = await prisma.earlyLeaveRequest.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu về sớm" }, { status: 404 });

    if (!(await employeeInScope(user, existing.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Chỉ có thể xóa yêu cầu đang chờ duyệt" }, { status: 400 });
    }

    await prisma.earlyLeaveRequest.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/early-leave-requests/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
