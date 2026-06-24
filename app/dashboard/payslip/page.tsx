import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PayslipListClient from "./PayslipListClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: { month?: string };
}

export default async function PayslipPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams?.month ?? defaultMonth;
  const [yearStr, monStr] = monthStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monStr);

  const [employees, company] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true, position: true,
        baseSalary: true, joinDate: true,
        summaries: {
          where: { year, month },
          select: {
            daysPresent: true, daysLate: true, daysAbsent: true,
            totalMinutesLate: true, totalPenalty: true,
            totalOvertimeAmount: true, totalMinutesOvertime: true,
          },
        },
      },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  ]);

  const rows = employees.map((e) => {
    const s = e.summaries[0];
    const base = e.baseSalary ?? 0;
    const penalty = s?.totalPenalty ?? 0;
    const overtime = s?.totalOvertimeAmount ?? 0;
    return {
      id: e.id,
      name: e.name,
      code: e.code,
      department: e.department ?? "",
      position: e.position ?? "",
      baseSalary: base,
      daysPresent: s?.daysPresent ?? 0,
      daysLate: s?.daysLate ?? 0,
      daysAbsent: s?.daysAbsent ?? 0,
      totalMinutesLate: s?.totalMinutesLate ?? 0,
      totalPenalty: penalty,
      totalOvertimeAmount: overtime,
      totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
      netSalary: base - penalty + overtime,
    };
  });

  return (
    <PayslipListClient
      rows={rows}
      companyName={company?.name ?? ""}
      currentMonth={monthStr}
    />
  );
}
