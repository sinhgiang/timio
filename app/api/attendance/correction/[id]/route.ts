import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";
import { notifyWorkerByEmployee } from "@/lib/workerNotify";

// PATCH — HR duyệt hoặc từ chối
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status, adminNote } = await req.json();
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const correction = await prisma.correctionRequest.findFirst({
      where: { id: params.id, employee: { companyId } },
      include: { employee: { select: { id: true, branchId: true } } },
    });
    if (!correction) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    if (!(await employeeInScope(user, correction.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    if (correction.status !== "pending") {
      return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 409 });
    }

    // Nếu duyệt → cập nhật AttendanceLog
    if (status === "approved") {
      const log = await prisma.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId: correction.employeeId, date: correction.date } },
      });

      const updateData: Record<string, unknown> = {};

      if (correction.type === "check_in" || correction.type === "both") {
        if (correction.requestedCheckIn) {
          const [h, m] = correction.requestedCheckIn.split(":").map(Number);
          const dt = new Date(correction.date + "T00:00:00");
          dt.setHours(h, m, 0, 0);
          updateData.checkInAt = dt;
          updateData.minutesLate = 0; // Reset, sẽ tính lại nếu cần
          updateData.status = "on_time";
        }
      }
      if (correction.type === "check_out" || correction.type === "both") {
        if (correction.requestedCheckOut) {
          const [h, m] = correction.requestedCheckOut.split(":").map(Number);
          const dt = new Date(correction.date + "T00:00:00");
          dt.setHours(h, m, 0, 0);
          updateData.checkOutAt = dt;
        }
      }

      if (log) {
        await prisma.attendanceLog.update({
          where: { id: log.id },
          data: updateData,
        });
      } else {
        // Tạo log mới nếu chưa có
        await prisma.attendanceLog.create({
          data: {
            employeeId: correction.employeeId,
            branchId: correction.employee.branchId,
            date: correction.date,
            status: "on_time",
            ...updateData,
          },
        });
      }
    }

    const updated = await prisma.correctionRequest.update({
      where: { id: params.id },
      data: { status, adminNote: adminNote ?? null },
    });

    void notifyWorkerByEmployee(correction.employeeId, {
      type: "correction",
      title: status === "approved" ? "Yêu cầu sửa chấm công được duyệt" : "Yêu cầu sửa chấm công bị từ chối",
      body: status === "approved" ? `Chấm công ngày ${new Date(correction.date).toLocaleDateString("vi-VN")} đã được cập nhật.` : `Yêu cầu sửa ngày ${new Date(correction.date).toLocaleDateString("vi-VN")}${adminNote ? ` — ${adminNote}` : ""}.`,
      link: "attendance", email: true,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
