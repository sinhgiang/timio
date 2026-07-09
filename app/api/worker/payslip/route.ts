import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { calculateTax } from "@/lib/taxCalculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Phiếu lương của tôi — chọn tháng (mặc định tháng VN hiện tại) + công ty (nếu làm nhiều nơi).
export async function GET(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const month = searchParams.get("month") || `${nowVN.getUTCFullYear()}-${String(nowVN.getUTCMonth() + 1).padStart(2, "0")}`;
  const wantCompany = searchParams.get("companyId") || "";
  const [year, mon] = month.split("-").map((x) => parseInt(x));

  const emps = await prisma.employee.findMany({
    where: { workerAccountId: id, status: "active" },
    select: { id: true, companyId: true, company: { select: { name: true } } },
  });
  if (emps.length === 0) return NextResponse.json({ payslip: null, companies: [], month });

  const target = (wantCompany && emps.find((e) => e.companyId === wantCompany)) || emps[0];
  const companies = emps.map((e) => ({ companyId: e.companyId, companyName: e.company?.name ?? "Công ty" }));

  const employee = await prisma.employee.findUnique({
    where: { id: target.id },
    select: {
      id: true, name: true, code: true, department: true, position: true,
      baseSalary: true, dependents: true, allowancesJson: true,
      branch: { select: { name: true, standardWorkDays: true } },
      company: { select: { name: true } },
      summaries: { where: { year, month: mon }, select: { daysPresent: true, daysLate: true, daysAbsent: true, totalMinutesLate: true, totalPenalty: true, totalReward: true, totalOvertimeAmount: true, totalMinutesOvertime: true } },
    },
  });
  if (!employee) return NextResponse.json({ payslip: null, companies, month });

  const s = employee.summaries[0];
  const base = employee.baseSalary ?? 0;
  const daysPresent = s?.daysPresent ?? 0;
  const standardWorkDays = employee.branch?.standardWorkDays ?? 26;
  const earnedBase = standardWorkDays > 0 ? Math.round((base / standardWorkDays) * daysPresent) : base;
  const penalty = s?.totalPenalty ?? 0, reward = s?.totalReward ?? 0, overtime = s?.totalOvertimeAmount ?? 0;
  let allowances: { label: string; amount: number }[] = [];
  try { allowances = employee.allowancesJson ? JSON.parse(employee.allowancesJson) : []; } catch { allowances = []; }
  const totalAllowances = allowances.reduce((a, x) => a + (x.amount ?? 0), 0);
  const grossIncome = earnedBase + totalAllowances - penalty + reward + overtime;
  const tax = calculateTax({ baseSalary: base, grossIncome, dependents: employee.dependents ?? 0 });

  const payslip = {
    companyName: employee.company?.name ?? "", position: employee.position ?? "", department: employee.department ?? "",
    year, month: mon,
    baseSalary: base, earnedBase, standardWorkDays,
    daysPresent, daysLate: s?.daysLate ?? 0, daysAbsent: s?.daysAbsent ?? 0, totalMinutesLate: s?.totalMinutesLate ?? 0,
    totalPenalty: penalty, totalReward: reward, totalOvertimeAmount: overtime, totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
    allowances, totalAllowances, grossIncome,
    bhxhEmployee: tax.bhxhEmployee, taxableIncome: tax.taxableIncome, tncn: tax.tncn, netTakeHome: tax.netTakeHome,
    dependents: employee.dependents ?? 0,
    hasData: !!s,
  };
  return NextResponse.json({ payslip, companies, month, companyId: target.companyId });
}
