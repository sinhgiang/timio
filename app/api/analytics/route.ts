import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { managerBranchId } from "@/lib/branchScope";

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  // ISO week number
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function getMonthLabel(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = user.companyId;
  const mgrBranch = managerBranchId(user);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
  const employeeId = searchParams.get("employeeId") ?? "";
  const department = searchParams.get("department") ?? "";

  try {
    // Get all branches for this company
    const branches = await prisma.branch.findMany({
      where: { companyId },
      select: { id: true },
    });
    // Quản lý chi nhánh: chỉ thống kê chi nhánh mình
    const branchIds = (mgrBranch ? branches.filter((b) => b.id === mgrBranch) : branches).map((b) => b.id);

    if (branchIds.length === 0) {
      return NextResponse.json({
        summary: { totalPresent: 0, totalLate: 0, totalAbsent: 0, totalOvertimeHours: 0 },
        lateByWeek: [],
        lateByMonth: [],
        topLateEmployees: [],
      });
    }

    // Get employees for department filter
    let employeeIds: string[] | null = null;
    if (department || employeeId) {
      const empFilter: { companyId: string; department?: string; id?: string; branchId?: string } = { companyId };
      if (department) empFilter.department = department;
      if (employeeId) empFilter.id = employeeId;
      if (mgrBranch) empFilter.branchId = mgrBranch;
      const emps = await prisma.employee.findMany({
        where: empFilter,
        select: { id: true },
      });
      employeeIds = emps.map((e) => e.id);
    }

    // Query attendance logs
    const whereClause: {
      branchId: { in: string[] };
      date: { gte: string; lte: string };
      employeeId?: { in: string[] };
    } = {
      branchId: { in: branchIds },
      date: { gte: from, lte: to },
    };
    if (employeeIds !== null) {
      whereClause.employeeId = { in: employeeIds };
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      select: {
        employeeId: true,
        date: true,
        status: true,
        minutesLate: true,
        minutesOvertime: true,
        employee: { select: { name: true, code: true, department: true } },
      },
    });

    // Aggregate summary
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalOvertimeMinutes = 0;

    const lateByWeekMap = new Map<string, number>();
    const lateByMonthMap = new Map<string, number>();
    const lateEmpMap = new Map<string, { name: string; code: string; count: number; totalMinutes: number }>();

    for (const log of logs) {
      if (log.status === "present" || log.status === "late") totalPresent++;
      if (log.status === "absent") totalAbsent++;

      const isLate = log.status === "late" || log.minutesLate > 0;
      if (isLate) {
        totalLate++;

        const week = getWeekLabel(log.date);
        lateByWeekMap.set(week, (lateByWeekMap.get(week) ?? 0) + 1);

        const month = getMonthLabel(log.date);
        lateByMonthMap.set(month, (lateByMonthMap.get(month) ?? 0) + 1);

        const existing = lateEmpMap.get(log.employeeId);
        if (existing) {
          existing.count++;
          existing.totalMinutes += log.minutesLate;
        } else {
          lateEmpMap.set(log.employeeId, {
            name: log.employee.name,
            code: log.employee.code,
            count: 1,
            totalMinutes: log.minutesLate,
          });
        }
      }

      totalOvertimeMinutes += log.minutesOvertime;
    }

    // Sort and format
    const lateByWeek = Array.from(lateByWeekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    const lateByMonth = Array.from(lateByMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    const topLateEmployees = Array.from(lateEmpMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalPresent,
        totalLate,
        totalAbsent,
        totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 10) / 10,
      },
      lateByWeek,
      lateByMonth,
      topLateEmployees,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Lỗi lấy dữ liệu phân tích" }, { status: 500 });
  }
}
