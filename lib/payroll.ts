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
// SỬA 17/9/2026 — bug: bản trước quy TẤT CẢ ngày công (kể cả ngày thường) theo lương CƠ BẢN rồi
// mới cộng phụ cấp cố định 1 lần/tháng — nghĩa là với tháng đi làm KHÔNG đủ công, ngày thường vẫn
// bị tính theo lương cơ bản chứ không phải lương tổng, sai với yêu cầu gốc của user: "ngày thường
// LUÔN tính theo lương tổng; chỉ ngày lễ/Tết mới theo đúng lựa chọn (holidayPayBasis)". Sửa: ngày
// thường (daysPresent - daysHoliday) quy theo effectiveTotalSalary/ngày; ngày lễ quy theo
// baseSalary HOẶC effectiveTotalSalary/ngày tuỳ holidayPayBasis. Đổi tên field cho rõ nghĩa:
// earnedBase → normalEarnings (lương ngày thường), holidayTopUp → holidayEarnings (lương ngày lễ,
// là số tiền ĐẦY ĐỦ của các ngày đó chứ không còn là phần "cộng thêm/top-up" như tên cũ).
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
  daysNormal: number; // số ngày công KHÔNG phải ngày lễ (daysPresent - daysHoliday)
  daysHoliday: number;
  normalEarnings: number; // Lương ngày thường — LUÔN quy theo lương tổng (effectiveTotalSalary)
  holidayEarnings: number; // Lương ngày lễ/Tết — quy theo lương cơ bản HOẶC lương tổng tuỳ holidayPayBasis
}

export function computePayroll(input: PayrollInput): PayrollResult {
  const totalAllowances = input.allowances.reduce((s, a) => s + (a.amount || 0), 0);
  const effectiveTotalSalary = input.officialSalary ?? input.baseSalary + totalAllowances;
  const standardWorkDays = input.standardWorkDays > 0 ? input.standardWorkDays : 26;
  const daysPresent = Math.max(0, input.daysPresent);
  const daysHoliday = Math.min(Math.max(0, input.daysHoliday), daysPresent);
  const daysNormal = daysPresent - daysHoliday;

  // Ngày thường: LUÔN quy theo lương TỔNG (không phải lương cơ bản) — kể cả khi đi làm không đủ
  // công trong tháng, phần ngày thường vẫn tính trên effectiveTotalSalary/standardWorkDays.
  const normalDayRate = effectiveTotalSalary / standardWorkDays;
  const normalEarnings = Math.round(normalDayRate * daysNormal);

  // Ngày lễ/Tết: quy theo ĐÚNG lựa chọn holidayPayBasis của nhân viên — "base" dùng lương cơ bản,
  // "total" dùng lương tổng. Đây là số tiền ĐẦY ĐỦ cho các ngày lễ, không phải phần chênh lệch.
  const holidayBasisSalary = input.holidayPayBasis === "total" ? effectiveTotalSalary : input.baseSalary;
  const holidayDayRate = holidayBasisSalary / standardWorkDays;
  const holidayEarnings = Math.round(holidayDayRate * daysHoliday);

  const grossIncome =
    normalEarnings + holidayEarnings - input.totalPenalty + input.totalReward + input.totalOvertimeAmount;

  const tax = calculateTax({ baseSalary: input.baseSalary, grossIncome, dependents: input.dependents });

  return {
    totalAllowances,
    effectiveTotalSalary,
    daysNormal,
    daysHoliday,
    normalEarnings,
    holidayEarnings,
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
