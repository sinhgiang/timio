import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateTax } from "@/lib/taxCalculator";
import { checkPin } from "@/lib/mobileEmployeeAuth";

const VN_TZ = "Asia/Ho_Chi_Minh";

// Tháng hiện tại theo giờ VN, dạng YYYY-MM
function currentVnMonth(): string {
  const d = new Date().toLocaleDateString("sv-SE", { timeZone: VN_TZ }); // YYYY-MM-DD
  return d.slice(0, 7);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const pin = searchParams.get("pin");
    const month = searchParams.get("month") || currentVnMonth();

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const [yearStr, monStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monStr, 10);

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, status: "active" },
      select: {
        pin: true,
        baseSalary: true,
        dependents: true,
        allowancesJson: true,
        branch: { select: { standardWorkDays: true } },
        summaries: {
          where: { year, month: mon },
          select: {
            daysPresent: true,
            daysLate: true,
            daysAbsent: true,
            totalPenalty: true,
            totalReward: true,
            totalOvertimeAmount: true,
          },
        },
      },
    });

    if (!employee || !(await checkPin(employee.pin, pin))) {
      return NextResponse.json({ error: "Sai mã PIN" }, { status: 401 });
    }

    const s = employee.summaries[0];
    const base = employee.baseSalary ?? 0;
    const daysPresent = s?.daysPresent ?? 0;
    const daysLate = s?.daysLate ?? 0;
    const daysAbsent = s?.daysAbsent ?? 0;
    const standardWorkDays = employee.branch.standardWorkDays ?? 26;
    const earnedBase =
      standardWorkDays > 0 ? Math.round((base / standardWorkDays) * daysPresent) : base;
    const penalty = s?.totalPenalty ?? 0;
    const reward = s?.totalReward ?? 0;
    const overtime = s?.totalOvertimeAmount ?? 0;

    const allowanceArr: { label: string; amount: number }[] = employee.allowancesJson
      ? (() => {
          try {
            return JSON.parse(employee.allowancesJson) as { label: string; amount: number }[];
          } catch {
            return [];
          }
        })()
      : [];
    const totalAllowances = allowanceArr.reduce((t, a) => t + (a.amount ?? 0), 0);

    const grossIncome = earnedBase + totalAllowances - penalty + reward + overtime;
    const tax = calculateTax({
      baseSalary: base,
      grossIncome,
      dependents: employee.dependents ?? 0,
    });

    return NextResponse.json({
      month,
      baseSalary: base,
      earnedBase,
      allowances: totalAllowances,
      daysPresent,
      daysLate,
      daysAbsent,
      penalty,
      reward,
      overtime,
      grossIncome,
      bhxhEmployee: tax.bhxhEmployee,
      tncn: tax.tncn,
      netTakeHome: tax.netTakeHome,
    });
  } catch (err) {
    console.error("[mobile/employee/payslip]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
