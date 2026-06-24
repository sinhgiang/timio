// Vietnam 2025 — BHXH + Thuế TNCN calculator

// BHXH ceiling: 20 × lương cơ sở 2,340,000 (hiệu lực từ 1/7/2024)
const BHXH_CEILING = 46_800_000;

// Tỉ lệ đóng BHXH phía nhân viên: BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5%
const BHXH_EMPLOYEE_RATE = 0.105;

// Tỉ lệ đóng BHXH phía công ty: BHXH 17.5% + BHYT 3% + BHTN 1% + BHTNNLĐ 0.5% = 22%
const BHXH_EMPLOYER_RATE = 0.22;

// Giảm trừ bản thân
const PERSONAL_DEDUCTION = 11_000_000;

// Giảm trừ người phụ thuộc
const DEPENDENT_DEDUCTION = 4_400_000;

// Bậc thuế TNCN hàng tháng (lũy tiến từng phần)
const PIT_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 5_000_000, rate: 0.05 },
  { limit: 10_000_000, rate: 0.10 },
  { limit: 18_000_000, rate: 0.15 },
  { limit: 32_000_000, rate: 0.20 },
  { limit: 52_000_000, rate: 0.25 },
  { limit: 80_000_000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

export interface TaxBreakdown {
  bhxhEmployee: number;   // Nhân viên đóng BHXH
  bhxhEmployer: number;   // Công ty đóng BHXH (để hiển thị tham khảo)
  grossIncome: number;    // Thu nhập trước thuế (sau phạt/thưởng/tăng ca)
  taxableIncome: number;  // Thu nhập tính thuế (sau giảm trừ)
  tncn: number;           // Thuế thu nhập cá nhân
  netTakeHome: number;    // Thực nhận sau tất cả khấu trừ
}

export function calculateTax(params: {
  baseSalary: number;        // Lương cơ bản (dùng tính BHXH)
  grossIncome: number;       // Thu nhập trước thuế = base + thưởng + tăng ca - phạt
  dependents?: number;       // Số người phụ thuộc
}): TaxBreakdown {
  const { baseSalary, grossIncome, dependents = 0 } = params;

  // 1. BHXH nhân viên (tính trên lương cơ bản, tối đa trần)
  const bhxhBase = Math.min(Math.max(baseSalary, 0), BHXH_CEILING);
  const bhxhEmployee = Math.round(bhxhBase * BHXH_EMPLOYEE_RATE);
  const bhxhEmployer = Math.round(bhxhBase * BHXH_EMPLOYER_RATE);

  // 2. Thu nhập tính thuế = Thu nhập - BHXH NV - Giảm trừ bản thân - Giảm trừ gia cảnh
  const taxableIncome = Math.max(
    0,
    grossIncome - bhxhEmployee - PERSONAL_DEDUCTION - dependents * DEPENDENT_DEDUCTION
  );

  // 3. Tính thuế TNCN lũy tiến từng phần
  let tncn = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;
  for (const bracket of PIT_BRACKETS) {
    if (remaining <= 0) break;
    const size =
      bracket.limit === Infinity
        ? remaining
        : Math.min(remaining, bracket.limit - prevLimit);
    tncn += size * bracket.rate;
    remaining -= size;
    prevLimit = bracket.limit;
  }
  tncn = Math.round(tncn);

  // 4. Thực nhận
  const netTakeHome = grossIncome - bhxhEmployee - tncn;

  return { bhxhEmployee, bhxhEmployer, grossIncome, taxableIncome, tncn, netTakeHome };
}

// Helper: format tỉ lệ bậc thuế để hiển thị
export function getPitRate(taxableIncome: number): number {
  let remaining = taxableIncome;
  let prevLimit = 0;
  let lastRate = 0;
  for (const bracket of PIT_BRACKETS) {
    if (remaining <= 0) break;
    lastRate = bracket.rate;
    const size =
      bracket.limit === Infinity ? remaining : Math.min(remaining, bracket.limit - prevLimit);
    remaining -= size;
    prevLimit = bracket.limit;
  }
  return lastRate;
}
