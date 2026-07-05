import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managerBranchId } from "@/lib/branchScope";

interface DeptStat {
  department: string;
  totalEmployees: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  avgLateMinutes: number;
  totalPenalty: number;
  presentRate: number;
  lateRate: number;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const mgrBranch = managerBranchId(user);

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const monthParam =
      searchParams.get("month") ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const parts = monthParam.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
    }

    const [employees, summaries] = await Promise.all([
      prisma.employee.findMany({
        where: { companyId, status: "active", ...(mgrBranch ? { branchId: mgrBranch } : {}) },
        select: { id: true, department: true },
      }),
      prisma.monthlySummary.findMany({
        where: { employee: { companyId, ...(mgrBranch ? { branchId: mgrBranch } : {}) }, year, month },
        select: {
          employeeId: true,
          daysPresent: true,
          daysLate: true,
          daysAbsent: true,
          totalMinutesLate: true,
          totalPenalty: true,
        },
      }),
    ]);

    // Build employee -> department map
    const empDeptMap = new Map<string, string>();
    for (const e of employees) {
      empDeptMap.set(e.id, e.department ?? "(Chưa phân bổ)");
    }

    // Initialize dept map with employee counts
    const deptMap = new Map<string, DeptStat & { _totalMinutesLate: number }>();
    for (const e of employees) {
      const dept = e.department ?? "(Chưa phân bổ)";
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          totalEmployees: 0,
          daysPresent: 0,
          daysLate: 0,
          daysAbsent: 0,
          avgLateMinutes: 0,
          totalPenalty: 0,
          presentRate: 0,
          lateRate: 0,
          _totalMinutesLate: 0,
        });
      }
      deptMap.get(dept)!.totalEmployees++;
    }

    // Aggregate summaries by department
    for (const s of summaries) {
      const dept = empDeptMap.get(s.employeeId) ?? "(Chưa phân bổ)";
      const d = deptMap.get(dept);
      if (!d) continue;
      d.daysPresent += s.daysPresent;
      d.daysLate += s.daysLate;
      d.daysAbsent += s.daysAbsent;
      d.totalPenalty += s.totalPenalty;
      d._totalMinutesLate += s.totalMinutesLate;
    }

    // Finalize rates and avgLateMinutes
    const result: DeptStat[] = Array.from(deptMap.values())
      .map(({ _totalMinutesLate, ...d }) => {
        const total = d.daysPresent + d.daysAbsent;
        const presentRate = total > 0 ? Math.round((d.daysPresent / total) * 100) : 0;
        const lateRate =
          d.daysPresent > 0 ? Math.round((d.daysLate / d.daysPresent) * 100) : 0;
        const avgLateMinutes =
          d.daysLate > 0 ? Math.round(_totalMinutesLate / d.daysLate) : 0;
        return { ...d, presentRate, lateRate, avgLateMinutes };
      })
      .sort((a, b) => a.department.localeCompare(b.department));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[department report]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
