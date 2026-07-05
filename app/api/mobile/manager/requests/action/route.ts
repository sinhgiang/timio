import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { employeeInScope } from "@/lib/branchScope";

/**
 * POST /api/mobile/manager/requests/action
 * body: { type: "overtime"|"early_leave"|"correction"|"shift_swap", id, action: "approve"|"reject", note? }
 * Duyệt / từ chối 1 đơn (ngoài nghỉ phép). Giới hạn theo chi nhánh của quản lý.
 * Trả về: { ok: true, id, status }
 */
export async function POST(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await req.json();
    const { type, id, action, note } = body as {
      type?: string;
      id?: string;
      action?: string;
      note?: string;
    };

    if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
    if (!["overtime", "early_leave", "correction", "shift_swap"].includes(type ?? "")) {
      return NextResponse.json({ error: "Loại đơn không hợp lệ" }, { status: 400 });
    }
    if (!["approve", "reject"].includes(action ?? "")) {
      return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
    }

    const status = action === "approve" ? "approved" : "rejected";
    const noteVal = note ?? null;

    if (type === "overtime") {
      const existing = await prisma.overtimeRequest.findFirst({
        where: { id, companyId: auth.companyId },
        select: { employeeId: true, date: true },
      });
      if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
      if (!(await employeeInScope(auth, existing.employeeId)))
        return NextResponse.json({ error: "Không có quyền với chi nhánh khác" }, { status: 403 });

      await prisma.overtimeRequest.update({
        where: { id },
        data: { status, note: noteVal },
      });

      // Mirror web behaviour: cập nhật AttendanceLog.overtimeStatus theo trạng thái đơn.
      if (status === "approved") {
        await prisma.attendanceLog.updateMany({
          where: { employeeId: existing.employeeId, date: existing.date },
          data: { overtimeStatus: "approved" },
        });
      } else {
        await prisma.attendanceLog.updateMany({
          where: { employeeId: existing.employeeId, date: existing.date, overtimeStatus: "approved" },
          data: { overtimeStatus: "rejected" },
        });
      }

      return NextResponse.json({ ok: true, id, status });
    }

    if (type === "early_leave") {
      const existing = await prisma.earlyLeaveRequest.findFirst({
        where: { id, companyId: auth.companyId },
        select: { employeeId: true },
      });
      if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
      if (!(await employeeInScope(auth, existing.employeeId)))
        return NextResponse.json({ error: "Không có quyền với chi nhánh khác" }, { status: 403 });

      await prisma.earlyLeaveRequest.update({
        where: { id },
        data: { status, note: noteVal },
      });
      return NextResponse.json({ ok: true, id, status });
    }

    if (type === "correction") {
      // CorrectionRequest không có companyId → lọc qua quan hệ employee, note field = adminNote.
      const existing = await prisma.correctionRequest.findFirst({
        where: { id, employee: { companyId: auth.companyId } },
        select: { employeeId: true },
      });
      if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
      if (!(await employeeInScope(auth, existing.employeeId)))
        return NextResponse.json({ error: "Không có quyền với chi nhánh khác" }, { status: 403 });

      await prisma.correctionRequest.update({
        where: { id },
        data: { status, adminNote: noteVal },
      });
      return NextResponse.json({ ok: true, id, status });
    }

    if (type === "shift_swap") {
      const existing = await prisma.shiftSwapRequest.findFirst({
        where: { id, companyId: auth.companyId },
        select: { requesterId: true },
      });
      if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
      if (!(await employeeInScope(auth, existing.requesterId)))
        return NextResponse.json({ error: "Không có quyền với chi nhánh khác" }, { status: 403 });

      await prisma.shiftSwapRequest.update({
        where: { id },
        data: { status, note: noteVal },
      });
      return NextResponse.json({ ok: true, id, status });
    }

    return NextResponse.json({ error: "Loại đơn không hợp lệ" }, { status: 400 });
  } catch (err) {
    console.error("[mobile/manager/requests/action]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
