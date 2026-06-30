import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { calculateTax } from "@/lib/taxCalculator";
import SalaryPaymentsClient from "./SalaryPaymentsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Thanh toán lương" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams?: { month?: string };
}

export default async function SalaryPaymentsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams?.month ?? defaultMonth;
  const [yearStr, monStr] = monthStr.split("-");
  const year  = parseInt(yearStr);
  const month = parseInt(monStr);

  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const [employees, company, payments, advances] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        status: "active",
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true,
        baseSalary: true, dependents: true,
        branch: { select: { name: true } },
        summaries: {
          where: { year, month },
          select: {
            totalPenalty: true, totalReward: true, totalOvertimeAmount: true,
          },
        },
      },
    }),
    prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
    prisma.salaryPayment.findMany({
      where: { companyId: user.companyId, year, month },
      select: { employeeId: true, status: true, paidAt: true, note: true, amount: true },
    }),
    prisma.salaryAdvance.findMany({
      where: { companyId: user.companyId, year, month, status: "approved" },
      select: { employeeId: true, amount: true },
    }),
  ]);

  const paymentMap = Object.fromEntries(
    payments.map((p) => [p.employeeId, {
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      note: p.note ?? null,
      amount: p.amount,
    }])
  );

  const advanceMap = new Map<string, number>();
  for (const a of advances) {
    advanceMap.set(a.employeeId, (advanceMap.get(a.employeeId) ?? 0) + a.amount);
  }

  const rows = employees.map((e) => {
    const s = e.summaries[0];
    const base = e.baseSalary ?? 0;
    const penalty   = s?.totalPenalty ?? 0;
    const reward    = s?.totalReward ?? 0;
    const overtime  = s?.totalOvertimeAmount ?? 0;
    const gross     = base - penalty + reward + overtime;
    const tax       = calculateTax({ baseSalary: base, grossIncome: gross, dependents: e.dependents ?? 0 });
    const advanceAmount = advanceMap.get(e.id) ?? 0;
    return {
      id:              e.id,
      name:            e.name,
      code:            e.code,
      department:      e.department ?? "",
      branchName:      e.branch.name,
      baseSalary:      base,
      netSalary:       tax.netTakeHome,
      advanceAmount,
      netAfterAdvance: Math.max(0, tax.netTakeHome - advanceAmount),
    };
  });

  return (
    <SalaryPaymentsClient
      rows={rows}
      companyName={company?.name ?? ""}
      currentMonth={monthStr}
      paymentMap={paymentMap}
    />
  );
}
