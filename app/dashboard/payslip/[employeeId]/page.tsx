import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PayslipPrint from "./PayslipPrint";
import { calculateTax } from "@/lib/taxCalculator";
import PlanUpgradePage from "@/components/ui/PlanUpgradePage";

export const dynamic = "force-dynamic";

interface Props {
  params: { employeeId: string };
  searchParams?: { month?: string };
}

export default async function PayslipDetailPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const planRow = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (!planRow || planRow.plan === "starter") {
    return (
      <PlanUpgradePage
        requiredPlan="pro"
        feature="Phiếu lương chi tiết"
        description="Xem và in phiếu lương chi tiết từng nhân viên với đầy đủ các khoản: lương cơ bản, thưởng, phạt, tăng ca, BHXH và thuế TNCN."
        bullets={[
          "Phiếu lương cá nhân từng tháng",
          "Tính BHXH & thuế TNCN tự động",
          "In phiếu lương chuyên nghiệp",
        ]}
      />
    );
  }

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
        baseSalary: true, joinDate: true, phone: true, dependents: true,
        bankName: true, bankAccount: true, bankBranch: true,
        branch: { select: { name: true, standardWorkDays: true } },
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
  const daysPresent = s?.daysPresent ?? 0;
  const standardWorkDays = employee.branch.standardWorkDays ?? 26;
  const earnedBase = standardWorkDays > 0
    ? Math.round((base / standardWorkDays) * daysPresent)
    : base;
  const penalty = s?.totalPenalty ?? 0;
  const reward = s?.totalReward ?? 0;
  const overtime = s?.totalOvertimeAmount ?? 0;
  const grossIncome = earnedBase - penalty + reward + overtime;

  const tax = calculateTax({
    baseSalary: base,
    grossIncome,
    dependents: employee.dependents ?? 0,
  });

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
    earnedBase,
    standardWorkDays,
    daysPresent,
    daysLate: s?.daysLate ?? 0,
    daysAbsent: s?.daysAbsent ?? 0,
    totalMinutesLate: s?.totalMinutesLate ?? 0,
    totalPenalty: penalty,
    totalReward: reward,
    totalOvertimeAmount: overtime,
    totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
    grossIncome,
    bhxhEmployee: tax.bhxhEmployee,
    bhxhEmployer: tax.bhxhEmployer,
    taxableIncome: tax.taxableIncome,
    tncn: tax.tncn,
    netTakeHome: tax.netTakeHome,
    dependents: employee.dependents ?? 0,
    companyName: company?.name ?? "",
    bankName: (employee as { bankName?: string | null }).bankName ?? "",
    bankAccount: (employee as { bankAccount?: string | null }).bankAccount ?? "",
    bankBranch: (employee as { bankBranch?: string | null }).bankBranch ?? "",
  };

  return <PayslipPrint data={data} />;
}
