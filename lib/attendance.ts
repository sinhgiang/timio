import type { RewardRule, AttendanceLog } from "@prisma/client";

export type CheckInStatus = "on_time" | "late" | "very_late" | "absent";

export interface CheckInResult {
  status: CheckInStatus;
  minutesLate: number;
  penaltyAmount: number;
  message: string;
}

export interface LateRule {
  fromMinutes: number;
  toMinutes: number;
  amount: number;
}

/**
 * Một PenaltyRule đầy đủ (kèm phạm vi áp dụng) — dùng để lọc trước khi đưa vào calculateCheckInStatus.
 * scopeEmployeeIds / scopeDepartments / scopeDaysOfWeek là chuỗi JSON (TEXT trong DB).
 * null hoặc mảng rỗng = không giới hạn (áp dụng cho tất cả).
 * Nếu scopeEmployeeIds có giá trị thì ưu tiên hơn scopeDepartments (2 kiểu phạm vi không cộng dồn).
 */
export interface ScopedPenaltyRule {
  id: string;
  fromMinutes: number;
  toMinutes: number;
  amount: number;
  type: string;
  scopeDepartments?: string | null;
  scopeEmployeeIds?: string | null;
  scopeDaysOfWeek?: string | null;
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Lọc danh sách quy tắc phạt (công ty) để chỉ giữ lại những quy tắc áp dụng
 * cho 1 nhân viên cụ thể vào 1 thời điểm cụ thể — dựa trên phòng ban/nhân viên/thứ trong tuần.
 * Dùng ở TẤT CẢ nơi tính phạt trễ/về sớm (checkin, checkin-face, checkin-qr, admin-edit, recalculate)
 * để đảm bảo hành vi nhất quán.
 */
export function filterApplicableRules<T extends ScopedPenaltyRule>(
  rules: T[],
  employee: { id: string; department?: string | null },
  atDate: Date
): T[] {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnDate = new Date(atDate.getTime() + VN_OFFSET_MS);
  const dayOfWeek = vnDate.getUTCDay(); // 0=CN, 1=T2 ... 6=T7 (giờ VN)

  return rules.filter((r) => {
    const scopeEmployeeIds = parseJsonArray(r.scopeEmployeeIds);
    if (scopeEmployeeIds.length > 0) {
      if (!scopeEmployeeIds.includes(employee.id)) return false;
    } else {
      const scopeDepartments = parseJsonArray(r.scopeDepartments);
      if (scopeDepartments.length > 0 && !scopeDepartments.includes(employee.department ?? "")) {
        return false;
      }
    }

    const scopeDays = parseJsonArray(r.scopeDaysOfWeek).map(Number);
    if (scopeDays.length > 0 && !scopeDays.includes(dayOfWeek)) return false;

    return true;
  });
}

export function calculateCheckInStatus(
  checkInAt: Date,
  scheduledTime: string,
  gracePeriod: number,
  penaltyRules: LateRule[]
): CheckInResult {
  const [hours, minutes] = scheduledTime.split(":").map(Number);
  // Compare in Vietnam time (UTC+7) — server runs on UTC so setHours() would be wrong
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const checkInVNMs = (checkInAt.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000);
  const checkInMinutes = Math.floor(checkInVNMs / 60000);
  const scheduledMinutes = hours * 60 + minutes;
  let diffMinutes = checkInMinutes - scheduledMinutes;
  if (diffMinutes < -720) diffMinutes += 1440; // overnight shift edge case

  if (diffMinutes <= gracePeriod) {
    return {
      status: "on_time",
      minutesLate: 0,
      penaltyAmount: 0,
      message: "Đúng giờ",
    };
  }

  const minutesLate = diffMinutes;
  const sortedRules = [...penaltyRules].sort(
    (a, b) => a.fromMinutes - b.fromMinutes
  );
  let penaltyAmount = 0;

  for (const rule of sortedRules) {
    if (minutesLate >= rule.fromMinutes && minutesLate <= rule.toMinutes) {
      penaltyAmount = rule.amount;
      break;
    }
    if (minutesLate > rule.toMinutes) {
      penaltyAmount = rule.amount;
    }
  }

  const status: CheckInStatus = minutesLate <= 15 ? "late" : "very_late";

  return {
    status,
    minutesLate,
    penaltyAmount,
    message: `Trễ ${minutesLate} phút${penaltyAmount > 0 ? ` - Trừ ${formatVND(penaltyAmount)}` : ""}`,
  };
}

interface MonthlySummaryInput {
  logs: AttendanceLog[];
  workDays: number;
  rewardRules: RewardRule[];
}

export interface MonthlySummaryResult {
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalReward: number;
}

export function calculateMonthlySummary({
  logs,
  workDays,
  rewardRules,
}: MonthlySummaryInput): MonthlySummaryResult {
  const presentLogs = logs.filter((l) => l.status !== "absent" && l.checkInAt);
  const daysPresent = presentLogs.length;
  const daysLate = logs.filter(
    (l) => l.status === "late" || l.status === "very_late"
  ).length;
  const daysAbsent = workDays - daysPresent;
  const totalMinutesLate = logs.reduce((sum, l) => sum + l.minutesLate, 0);
  const totalPenalty = logs.reduce((sum, l) => sum + l.penaltyAmount, 0);

  let totalReward = 0;
  for (const rule of rewardRules) {
    if (rule.condition === "zero_late_days" && daysLate === 0 && daysPresent > 0) {
      totalReward += rule.amount;
    }
    if (rule.condition === "full_attendance" && daysAbsent === 0 && daysPresent === workDays) {
      totalReward += rule.amount;
    }
  }

  return {
    daysPresent,
    daysLate,
    daysAbsent: Math.max(0, daysAbsent),
    totalMinutesLate,
    totalPenalty,
    totalReward,
  };
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    on_time: "Đúng giờ",
    late: "Trễ",
    very_late: "Trễ nhiều",
    absent: "Vắng",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    on_time: "bg-green-100 text-green-800",
    late: "bg-yellow-100 text-yellow-800",
    very_late: "bg-red-100 text-red-800",
    absent: "bg-gray-100 text-gray-600",
  };
  return colors[status] ?? "bg-gray-100 text-gray-600";
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export interface Th13Breakdown {
  month: number;
  eligible: boolean;
  daysPresent: number;
}

export interface Th13Result {
  eligibleMonths: number;
  amount: number;
  breakdown: Th13Breakdown[];
}

export function calculate13thMonth(params: {
  baseSalary: number;
  joinDate: Date | null;
  year: number;
  monthlySummaries: Array<{ month: number; year: number; daysPresent: number }>;
  minDaysThreshold?: number;
}): Th13Result {
  const { baseSalary, joinDate, year, monthlySummaries, minDaysThreshold = 15 } = params;

  const startMonth =
    joinDate && joinDate.getFullYear() === year ? joinDate.getMonth() + 1 : 1;

  const summaryMap = new Map(
    monthlySummaries
      .filter((s) => s.year === year)
      .map((s) => [s.month, s.daysPresent])
  );

  const breakdown: Th13Breakdown[] = [];
  let eligibleMonths = 0;

  for (let m = 1; m <= 12; m++) {
    if (m < startMonth) {
      breakdown.push({ month: m, eligible: false, daysPresent: 0 });
      continue;
    }
    const daysPresent = summaryMap.get(m) ?? 0;
    const eligible = daysPresent >= minDaysThreshold;
    if (eligible) eligibleMonths++;
    breakdown.push({ month: m, eligible, daysPresent });
  }

  const rawAmount = (baseSalary * eligibleMonths) / 12;
  const amount = Math.floor(rawAmount / 1000) * 1000;

  return { eligibleMonths, amount, breakdown };
}
