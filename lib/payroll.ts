// Công thức tính lương DÙNG CHUNG cho mọi nơi hiển thị/xuất phiếu lương — trước đây công thức
// earnedBase/grossIncome bị copy-paste riêng ở 4 route khác nhau (employee/payslip, worker/payslip,
// mobile/employee/payslip, dashboard/payslip) — gộp về đây để sửa 1 chỗ, áp dụng mọi nơi.
//
// Thêm "Tổng lương" (officialSalary, có thể null = tự tính = baseSalary + tổng phụ cấp) và
// "Áp dụng lương nào cho ngày lễ/Tết" (holidayPayBasis: "base" | "total") theo yêu cầu user
// (13/9/2026): nhiều công ty chỉ đóng BHXH trên lương cơ bản (thấp hơn thực nhận) để giảm 32%
// phí BHXH, nhưng ngày lễ/Tết (nghỉ hưởng nguyên lương — Điều 112 BLLĐ) có công ty trả theo
// lương cơ bản, có công ty trả theo lương chính thức/tổng lương (cao hơn).
//
// QUAN TRỌNG — không double-count phụ cấp: totalAllowances vẫn được cộng ĐỦ 1 lần/tháng như cũ
// (không đổi, không prorate theo daysPresent — hành vi cũ giữ nguyên). Khi holidayPayBasis="total",
// KHÔNG cộng thêm effectiveTotalSalary/ngày cho các ngày lễ (sẽ trùng phần phụ cấp đã cộng đủ ở
// trên) — thay vào đó chỉ cộng THÊM đúng phần CHÊNH LỆCH giữa "lương tổng" và "lương cơ bản" quy
// ra theo ngày, nhân với số ngày lễ (holidayTopUp) — xem giải thích chi tiết trong computePayroll().
import { calculateTax, type TaxBreakdown } from "@/lib/taxCalculator";

export interface AllowanceItem {
  label: string;
  amount: number;
}

export interface PayrollInput {
  baseSalary: number; // Lương cơ bản — luôn là căn cứ đóng BHXH, KHÔNG đổi theo holidayPayBasis
  officialSalary: number | null; // "Tổng lương" ghi đè tay; null = tự tính (baseSalary + tổng phụ cấp)
  holidayPayBasis: string; // "base" | "total"
  allowances: AllowanceItem[];
  standardWorkDays: number;
  daysPresent: number;
  daysHoliday: number; // số ngày trong daysPresent là ngày lễ/Tết (không phải ngày làm thật)
  totalPenalty: number;
  totalReward: number;
  totalOvertimeAmount: number;
  dependents: number;
}

export interface PayrollResult extends TaxBreakdown {
  totalAllowances: number;
  effectiveTotalSalary: number; // "Tổng lương" thực dùng để tính (officialSalary hoặc tự tính)
  earnedBase: number; // Lương cơ bản quy theo số ngày công (như công thức cũ, không đổi)
  holidayTopUp: number; // Phần cộng thêm cho ngày lễ khi holidayPayBasis="total" (0 nếu "base")
  daysHoliday: number;
}

export function computePayroll(input: PayrollInput): PayrollResult {
  const totalAllowances = input.allowances.reduce((s, a) => s + (a.amount || 0), 0);
  const effectiveTotalSalary = input.officialSalary ?? input.baseSalary + totalAllowances;
  const standardWorkDays = input.standardWorkDays > 0 ? input.standardWorkDays : 26;
  const daysPresent = Math.max(0, input.daysPresent);
  const daysHoliday = Math.min(Math.max(0, input.daysHoliday), daysPresent);

  // earnedBase: giữ NGUYÊN công thức cũ (lương cơ bản quy theo ngày công, áp dụng cho MỌI ngày
  // trong daysPresent kể cả ngày lễ) — không đổi hành vi cho công ty chưa đụng tới tính năng này.
  const dayRateBase = input.baseSalary / standardWorkDays;
  const earnedBase = Math.round(dayRateBase * daysPresent);

  // holidayTopUp: chỉ cộng thêm khi holidayPayBasis="total" — phần CHÊNH LỆCH mỗi ngày giữa
  // "tổng lương" và "lương cơ bản", nhân với số ngày lễ. Không đụng tới totalAllowances (đã cộng
  // đủ 1 lần ở trên) nên không trùng lặp.
  const dayRateExtra = (effectiveTotalSalary - input.baseSalary) / standardWorkDays;
  const holidayTopUp = input.holidayPayBasis === "total" ? Math.round(dayRateExtra * daysHoliday) : 0;

  const grossIncome =
    earnedBase + totalAllowances + holidayTopUp - input.totalPenalty + input.totalReward + input.totalOvertimeAmount;

  const tax = calculateTax({ baseSalary: input.baseSalary, grossIncome, dependents: input.dependents });

  return {
    totalAllowances,
    effectiveTotalSalary,
    earnedBase,
    holidayTopUp,
    daysHoliday,
    ...tax,
  };
}

/** Parse an toàn Employee.allowancesJson (JSON string) → mảng phụ cấp, lỗi = mảng rỗng. */
export function parseAllowances(json: string | null | undefined): AllowanceItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as AllowanceItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
