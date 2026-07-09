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

    // Duyệt đơn = CHỐT TIỀN luôn (một lần): với các bản ghi tăng ca THỰC TẾ đang chờ
    // của ngày đó → set approved + CỘNG tiền vào MonthlySummary (giống màn Tăng ca).
    if (status === "approved") {
      const year = parseInt(existing.date.split("-")[0]);
      const month = parseInt(existing.date.split("-")[1]);
      const otLogs = await prisma.attendanceLog.findMany({
        where: { employeeId: existing.employeeId, date: existing.date, minutesOvertime: { gt: 0 }, overtimeStatus: "pending" },
        select: { id: true, minutesOvertime: true, overtimeAmount: true },
      });
      for (const l of otLogs) {
        await prisma.attendanceLog.update({ where: { id: l.id }, data: { overtimeStatus: "approved" } });
        await prisma.monthlySummary.upsert({
          where: { employeeId_year_month: { employeeId: existing.employeeId, year, month } },
          create: { employeeId: existing.employeeId, year, month, totalMinutesOvertime: l.minutesOvertime, totalOvertimeAmount: l.overtimeAmount },
          update: { totalMinutesOvertime: { increment: l.minutesOvertime }, totalOvertimeAmount: { increment: l.overtimeAmount } },
        });
      }
    } else if (status === "rejected") {
      // Từ chối: các bản ghi tăng ca đang CHỜ của ngày đó → rejected (chưa cộng tiền nên không cần trừ)
      await prisma.attendanceLog.updateMany({
        where: { employeeId: existing.employeeId, date: existing.date, overtimeStatus: "pending" },
        data: { overtimeStatus: "rejected", overtimeAmount: 0 },
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
