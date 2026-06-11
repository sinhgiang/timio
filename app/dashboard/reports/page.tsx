import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);

  const [employees, logs] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        employee: { companyId },
        date: {
          gte: `${year}-${String(month).padStart(2, "0")}-01`,
          lte: `${year}-${String(month).padStart(2, "0")}-31`,
        },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const summaries = await prisma.monthlySummary.findMany({
    where: {
      employee: { companyId },
      year,
      month,
    },
    include: { employee: true },
  });

  return (
    <ReportsClient
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        department: e.department,
        branchName: e.branch.name,
      }))}
      logs={logs.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        date: l.date,
        checkInAt: l.checkInAt?.toISOString() ?? null,
        checkOutAt: l.checkOutAt?.toISOString() ?? null,
        minutesLate: l.minutesLate,
        minutesOvertime: l.minutesOvertime,
        status: l.status,
        penaltyAmount: l.penaltyAmount,
        overtimeAmount: l.overtimeAmount,
        note: l.note ?? null,
      }))}
      summaries={summaries.map((s) => ({
        employeeId: s.employeeId,
        employeeName: s.employee.name,
        daysPresent: s.daysPresent,
        daysLate: s.daysLate,
        daysAbsent: s.daysAbsent,
        totalMinutesLate: s.totalMinutesLate,
        totalPenalty: s.totalPenalty,
        totalReward: s.totalReward,
        totalMinutesOvertime: s.totalMinutesOvertime,
        totalOvertimeAmount: s.totalOvertimeAmount,
      }))}
      year={year}
      month={month}
    />
  );
}
