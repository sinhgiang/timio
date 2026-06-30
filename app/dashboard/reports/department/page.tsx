import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DepartmentReportClient from "./DepartmentReportClient";

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

export default async function DepartmentReportPage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [employees, summaries] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: { id: true, department: true },
    }),
    prisma.monthlySummary.findMany({
      where: { employee: { companyId }, year, month },
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
  const deptStats: DeptStat[] = Array.from(deptMap.values())
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

  return (
    <DepartmentReportClient
      initialData={deptStats}
      initialMonth={`${year}-${String(month).padStart(2, "0")}`}
    />
  );
}
