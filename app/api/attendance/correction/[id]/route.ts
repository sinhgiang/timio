import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — HR duyệt hoặc từ chối
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
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

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
