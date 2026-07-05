import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { logId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json(); // "approve" | "reject"
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "action phải là approve hoặc reject" }, { status: 400 });
    }

    // Verify log belongs to this company
    const log = await prisma.attendanceLog.findUnique({
      where: { id: params.logId },
      include: { employee: { select: { companyId: true } } },
    });
    if (!log || log.employee.companyId !== companyId) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi" }, { status: 404 });
    }
    if (!(await employeeInScope(user, log.employeeId)))
      return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });
    if (log.overtimeStatus !== "pending") {
      return NextResponse.json({ error: "Bản ghi này không ở trạng thái chờ duyệt" }, { status: 400 });
    }

    const year = parseInt(log.date.split("-")[0]);
    const month = parseInt(log.date.split("-")[1]);

    if (action === "approve") {
      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: { overtimeStatus: "approved" },
      });
      // Cập nhật MonthlySummary khi được duyệt
      await prisma.monthlySummary.upsert({
        where: { employeeId_year_month: { employeeId: log.employeeId, year, month } },
        create: {
          employeeId: log.employeeId,
          year,
          month,
          totalMinutesOvertime: log.minutesOvertime,
          totalOvertimeAmount: log.overtimeAmount,
        },
        update: {
          totalMinutesOvertime: { increment: log.minutesOvertime },
          totalOvertimeAmount: { increment: log.overtimeAmount },
        },
      });
      return NextResponse.json({ success: true, status: "approved", overtimeAmount: log.overtimeAmount });
    } else {
      // Reject: giữ minutesOvertime (thông tin) nhưng đặt amount = 0
      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: { overtimeStatus: "rejected", overtimeAmount: 0 },
      });
      return NextResponse.json({ success: true, status: "rejected", overtimeAmount: 0 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
