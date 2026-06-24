import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTax } from "@/lib/taxCalculator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month"); // YYYY-MM

  if (!employeeId || !month) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

  const [yearStr, monStr] = month.split("-");
  const year = parseInt(yearStr);
  const mon = parseInt(monStr);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true, name: true, code: true, department: true, position: true,
      baseSalary: true, dependents: true, phone: true, joinDate: true,
      bankName: true, bankAccount: true, bankBranch: true,
      branch: { select: { name: true } },
      company: { select: { name: true } },
      summaries: {
        where: { year, month: mon },
        select: {
          daysPresent: true, daysLate: true, daysAbsent: true,
          totalMinutesLate: true, totalPenalty: true, totalReward: true,
          totalOvertimeAmount: true, totalMinutesOvertime: true,
        },
      },
    },
  });

  if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const s = employee.summaries[0];
  const base = employee.baseSalary ?? 0;
  const penalty = s?.totalPenalty ?? 0;
  const reward = s?.totalReward ?? 0;
  const overtime = s?.totalOvertimeAmount ?? 0;
  const grossIncome = base - penalty + reward + overtime;
  const tax = calculateTax({ baseSalary: base, grossIncome, dependents: employee.dependents ?? 0 });

  return NextResponse.json({
    employeeName: employee.name,
    employeeCode: employee.code,
    department: employee.department ?? "",
    position: employee.position ?? "",
    branch: employee.branch.name,
    companyName: employee.company.name,
    phone: employee.phone ?? "",
    bankName: employee.bankName ?? "",
    bankAccount: employee.bankAccount ?? "",
    bankBranch: employee.bankBranch ?? "",
    joinDate: employee.joinDate ? employee.joinDate.toISOString().split("T")[0] : "",
    year, month: mon,
    baseSalary: base,
    daysPresent: s?.daysPresent ?? 0,
    daysLate: s?.daysLate ?? 0,
    daysAbsent: s?.daysAbsent ?? 0,
    totalMinutesLate: s?.totalMinutesLate ?? 0,
    totalPenalty: penalty,
    totalReward: reward,
    totalOvertimeAmount: overtime,
    totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
    grossIncome,
    bhxhEmployee: tax.bhxhEmployee,
    taxableIncome: tax.taxableIncome,
    tncn: tax.tncn,
    netTakeHome: tax.netTakeHome,
    dependents: employee.dependents ?? 0,
  });
}
