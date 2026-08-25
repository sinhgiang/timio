// Cấu hình tăng ca (Company.overtimeRates — JSON-in-TEXT, tái dùng field đã có sẵn, không cần
// migration DB). Trước đây field này chỉ có weekday/weekend và KHÔNG có UI chỉnh — hàm ở đây
// vừa gom logic tính tăng ca đang bị lặp lại ở 3 route check-out (checkin-face/checkin-qr/checkin),
// vừa thêm "ngưỡng phút tối thiểu" để tránh ra muộn vài phút cũng bị tính là tăng ca (25/8/2026).
export interface OvertimeConfig {
  weekday: number; // hệ số lương tăng ca ngày thường (vd 1.5 = 150%)
  weekend: number; // hệ số lương tăng ca cuối tuần (vd 2.0 = 200%)
  minMinutes: number; // ra muộn hơn giờ tan ca dưới N phút này thì KHÔNG tính là tăng ca
}

export const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  weekday: 1.5,
  weekend: 2.0,
  minMinutes: 30,
};

function clampNumber(n: unknown, def: number, min: number, max: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : def;
  return Math.min(max, Math.max(min, v));
}

export function sanitizeOvertimeConfig(raw: unknown): OvertimeConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<OvertimeConfig>;
  return {
    weekday: clampNumber(r.weekday, DEFAULT_OVERTIME_CONFIG.weekday, 1, 5),
    weekend: clampNumber(r.weekend, DEFAULT_OVERTIME_CONFIG.weekend, 1, 5),
    minMinutes: Math.round(clampNumber(r.minMinutes, DEFAULT_OVERTIME_CONFIG.minMinutes, 0, 240)),
  };
}

export interface OvertimeComputeResult {
  minutesOvertime: number;
  overtimeAmount: number;
}

/**
 * Tính tăng ca khi check-out muộn hơn giờ tan ca (coMinutesDiff = số phút ra muộn, có thể âm).
 * Ra muộn <= cfg.minMinutes → KHÔNG tính là tăng ca (0 phút, 0đ) — vd ra muộn 4-5 phút do đi
 * chào sếp/dọn bàn không tạo bản ghi "chờ duyệt" vô lý nữa. Ra muộn > ngưỡng → tính tăng ca theo
 * TOÀN BỘ số phút muộn (không trừ ngưỡng), nhất quán với cách tính "trễ giờ vào ca"
 * (xem calculateCheckInStatus trong lib/attendance.ts — cùng kiểu ân hạn nhị phân).
 */
export function computeCheckoutOvertime(
  coMinutesDiff: number,
  cfg: OvertimeConfig,
  baseSalary: number | null | undefined,
  standardWorkDays: number | null | undefined,
  isWeekend: boolean
): OvertimeComputeResult {
  const minutesOvertime = coMinutesDiff > cfg.minMinutes ? coMinutesDiff : 0;
  if (minutesOvertime === 0) return { minutesOvertime: 0, overtimeAmount: 0 };

  const multiplier = isWeekend ? cfg.weekend : cfg.weekday;
  const dailyRate = (baseSalary ?? 0) / (standardWorkDays ?? 26);
  const hourlyRate = dailyRate / 8;
  const overtimeAmount = Math.floor(hourlyRate * (minutesOvertime / 60) * multiplier);

  return { minutesOvertime, overtimeAmount };
}
