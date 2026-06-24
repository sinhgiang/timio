import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PayslipPrint from "./PayslipPrint";

export const dynamic = "force-dynamic";

interface Props {
  params: { employeeId: string };
  searchParams?: { month?: string };
}

export default async function PayslipDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams?.month ?? defaultMonth;
  const [yearStr, monStr] = monthStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monStr);

  const [employee, company] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: params.employeeId, companyId },
      select: {
        id: true, name: true, code: true, department: true, position: true,
        baseSalary: true, joinDate: true, phone: true, cccd: true,
        branch: { select: { name: true } },
        summaries: {
          where: { year, month },
          select: {
            daysPresent: true, daysLate: true, daysAbsent: true,
            totalMinutesLate: true, totalPenalty: true, totalReward: true,
            totalOvertimeAmount: true, totalMinutesOvertime: true,
          },
        },
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
  ]);

  if (!employee) notFound();

  const s = employee.summaries[0];
  const base = employee.baseSalary ?? 0;
  const penalty = s?.totalPenalty ?? 0;
  const reward = s?.totalReward ?? 0;
  const overtime = s?.totalOvertimeAmount ?? 0;
  const net = base - penalty + reward + overtime;

  const data = {
    employeeId: employee.id,
    employeeName: employee.name,
    employeeCode: employee.code,
    department: employee.department ?? "",
    position: employee.position ?? "",
    branch: employee.branch.name,
    phone: employee.phone ?? "",
    joinDate: employee.joinDate ? employee.joinDate.toISOString().split("T")[0] : "",
    year,
    month,
    baseSalary: base,
    daysPresent: s?.daysPresent ?? 0,
    daysLate: s?.daysLate ?? 0,
    daysAbsent: s?.daysAbsent ?? 0,
    totalMinutesLate: s?.totalMinutesLate ?? 0,
    totalPenalty: penalty,
    totalReward: reward,
    totalOvertimeAmount: overtime,
    totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
    netSalary: net,
    companyName: company?.name ?? "",
  };

  return <PayslipPrint data={data} />;
}
