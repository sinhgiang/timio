import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus } from "@/lib/attendance";
import { managerBranchId } from "@/lib/branchScope";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = (session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined);
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["owner", "manager", "accountant"].includes(user.role ?? "")) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const { employeeId, date, checkInAt, checkOutAt, note } = await req.json();
    if (!employeeId || !date) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: user.companyId },
      include: { branch: true, company: { include: { penaltyRules: true } } },
    });
    if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const mgrBranch = managerBranchId(user);
    if (mgrBranch && employee.branchId !== mgrBranch) {
      return NextResponse.json({ error: "Bạn chỉ được sửa chấm công nhân viên chi nhánh mình." }, { status: 403 });
    }

    const checkInDate = checkInAt ? new Date(checkInAt) : null;
    const checkOutDate = checkOutAt ? new Date(checkOutAt) : null;

    // Tính trạng thái check-in
    let status = "absent";
    let minutesLate = 0;
    let penaltyAmount = 0;

    if (checkInDate) {
      const shiftData = employee.shiftOverride ? JSON.parse(employee.shiftOverride) as { checkInTime?: string; gracePeriod?: number } : {};
      const checkInTime = shiftData.checkInTime ?? employee.branch.checkInTime;
      const gracePeriod = shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const lateRules = employee.company.penaltyRules
        .filter((r) => r.type !== "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));

      const result = calculateCheckInStatus(checkInDate, checkInTime, gracePeriod, lateRules);
      status = result.status;
      minutesLate = result.minutesLate;
      penaltyAmount = result.penaltyAmount;
    }

    // Upsert AttendanceLog trực tiếp
    const existing = await prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });

    if (existing) {
      await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkInAt: checkInDate,
          checkOutAt: checkOutDate,
          status,
          minutesLate,
          penaltyAmount,
          note: note || null,
        },
      });
    } else {
      await prisma.attendanceLog.create({
        data: {
          employeeId,
          branchId: employee.branchId,
          date,
          checkInAt: checkInDate,
          checkOutAt: checkOutDate,
          status,
          minutesLate,
          penaltyAmount,
          note: note || null,
        },
      });
    }

    // Recompute MonthlySummary
    const [y, m] = date.split("-").map(Number);
    const monthLogs = await prisma.attendanceLog.findMany({
      where: { employeeId, date: { startsWith: `${y}-${String(m).padStart(2, "0")}` } },
    });
    const daysPresent = monthLogs.filter((l) => l.status !== "absent" && l.checkInAt).length;
    const daysLate = monthLogs.filter((l) => l.minutesLate > 0).length;
    const totalMinutesLate = monthLogs.reduce((s, l) => s + l.minutesLate, 0);
    const totalPenalty = monthLogs.reduce((s, l) => s + l.penaltyAmount, 0);

    await prisma.monthlySummary.upsert({
      where: { employeeId_year_month: { employeeId, year: y, month: m } },
      create: { employeeId, year: y, month: m, daysPresent, daysLate, totalMinutesLate, totalPenalty },
      update: { daysPresent, daysLate, totalMinutesLate, totalPenalty },
    });

    return NextResponse.json({ ok: true, status, minutesLate, penaltyAmount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
