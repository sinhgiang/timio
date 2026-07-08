import { prisma } from "@/lib/prisma";

const STANDARD_WORKDAYS = 26; // quy ước ngày công chuẩn/tháng để tạm tính đơn giá

export interface CompanyEarning {
  companyName: string;
  daysWorked: number;
  baseSalary: number;
  earnedSoFar: number; // tạm tính
  payday: number;      // ngày phát lương trong tháng
  daysToPayday: number;
}

export interface WorkerEarnings {
  month: string;              // "YYYY-MM"
  monthLabel: string;         // "tháng 7/2026"
  total: number;
  totalDaysWorked: number;
  companies: CompanyEarning[];
}

export async function computeWorkerEarnings(workerAccountId: string): Promise<WorkerEarnings> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const today = now.getDate();

  const employees = await prisma.employee.findMany({
    where: { workerAccountId, status: "active" },
    select: {
      id: true, baseSalary: true,
      company: { select: { name: true, paydayOfMonth: true } },
    },
  });

  const companies: CompanyEarning[] = [];
  let total = 0;
  let totalDaysWorked = 0;

  for (const e of employees) {
    const daysWorked = await prisma.attendanceLog.count({
      where: { employeeId: e.id, date: { startsWith: monthPrefix }, checkInAt: { not: null } },
    });
    const base = e.baseSalary ?? 0;
    const dailyRate = base > 0 ? base / STANDARD_WORKDAYS : 0;
    const earnedSoFar = Math.round(daysWorked * dailyRate);
    const payday = e.company?.paydayOfMonth ?? 5;
    // Số ngày tới kỳ lương gần nhất
    const daysToPayday = today <= payday ? payday - today : (daysInMonth(year, month) - today) + payday;

    companies.push({
      companyName: e.company?.name ?? "Công ty",
      daysWorked, baseSalary: base, earnedSoFar, payday, daysToPayday,
    });
    total += earnedSoFar;
    totalDaysWorked += daysWorked;
  }

  return {
    month: monthPrefix,
    monthLabel: `tháng ${month}/${year}`,
    total,
    totalDaysWorked,
    companies,
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
