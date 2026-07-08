import { prisma } from "@/lib/prisma";

// Ứng lương sớm (EWA) — employer-funded. Timio KHÔNG bỏ vốn, chỉ tính toán + thu phí dịch vụ.
// Trần được ứng luôn ≤ lương ĐÃ KIẾM trong kỳ → không bao giờ thành khoản vay (Điều 101 BLLĐ 2019).

const STANDARD_WORKDAYS = 26; // quy ước ngày công chuẩn/tháng
export const MIN_ADVANCE = 50000; // ứng tối thiểu 50.000đ

// Phí là phí dịch vụ CỐ ĐỊNH (không tính theo thời gian = không phải lãi).
export function computeFee(feeType: string, feeValue: number, amount: number): number {
  if (feeType === "percent") return Math.round((amount * feeValue) / 1000); // feeValue 15 => 1.5%
  return feeValue; // fixed: phí cố định mỗi lần ứng
}

export interface EwaOption {
  employeeId: string;
  companyId: string;
  companyName: string;
  ewaEnabled: boolean;
  approvalMode: string;      // "manual" | "auto"
  daysWorked: number;
  earnedSoFar: number;       // lương đã kiếm kỳ này (tạm tính)
  maxPercent: number;
  advanceCap: number;        // trần = floor(maxPercent% × earnedSoFar)
  alreadyAdvanced: number;   // đã ứng (pending + approved) trong tháng
  available: number;         // còn có thể ứng
  advancesThisMonth: number;
  maxPerMonth: number;
  feeType: string;
  feeValue: number;
  reason: string | null;     // vì sao chưa ứng được (nếu available = 0)
}

export interface EwaOptionsResult {
  month: string;             // "YYYY-MM"
  monthLabel: string;
  options: EwaOption[];
}

export async function getEwaOptions(workerAccountId: string): Promise<EwaOptionsResult> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  const employees = await prisma.employee.findMany({
    where: { workerAccountId, status: "active" },
    select: {
      id: true, baseSalary: true,
      company: {
        select: {
          id: true, name: true,
          ewaEnabled: true, ewaApprovalMode: true, ewaMaxPercent: true,
          ewaFeeType: true, ewaFeeValue: true, ewaMaxPerMonth: true,
        },
      },
    },
  });

  const options: EwaOption[] = [];
  for (const e of employees) {
    const c = e.company;
    const daysWorked = await prisma.attendanceLog.count({
      where: { employeeId: e.id, date: { startsWith: monthPrefix }, checkInAt: { not: null } },
    });
    const base = e.baseSalary ?? 0;
    const earnedSoFar = base > 0 ? Math.round(daysWorked * (base / STANDARD_WORKDAYS)) : 0;
    const maxPercent = c?.ewaMaxPercent ?? 50;
    const advanceCap = Math.floor((earnedSoFar * maxPercent) / 100);

    const agg = await prisma.salaryAdvance.aggregate({
      where: { employeeId: e.id, year, month, status: { in: ["pending", "approved"] } },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const alreadyAdvanced = agg._sum.amount ?? 0;
    const advancesThisMonth = agg._count._all ?? 0;
    const maxPerMonth = c?.ewaMaxPerMonth ?? 4;
    let available = Math.max(0, advanceCap - alreadyAdvanced);

    let reason: string | null = null;
    if (!c?.ewaEnabled) { reason = "Công ty chưa bật ứng lương."; available = 0; }
    else if (advancesThisMonth >= maxPerMonth) { reason = `Đã dùng hết ${maxPerMonth} lần ứng trong tháng.`; available = 0; }
    else if (earnedSoFar <= 0) { reason = "Chưa có ngày công nào tháng này."; available = 0; }
    else if (available < MIN_ADVANCE) { reason = `Số có thể ứng nhỏ hơn mức tối thiểu ${MIN_ADVANCE.toLocaleString("vi-VN")}đ.`; }

    options.push({
      employeeId: e.id,
      companyId: c?.id ?? "",
      companyName: c?.name ?? "Công ty",
      ewaEnabled: !!c?.ewaEnabled,
      approvalMode: c?.ewaApprovalMode ?? "manual",
      daysWorked, earnedSoFar, maxPercent, advanceCap,
      alreadyAdvanced, available, advancesThisMonth, maxPerMonth,
      feeType: c?.ewaFeeType ?? "fixed",
      feeValue: c?.ewaFeeValue ?? 10000,
      reason,
    });
  }

  return { month: monthPrefix, monthLabel: `tháng ${month}/${year}`, options };
}
