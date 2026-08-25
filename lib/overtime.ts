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

// Cấu hình tăng ca RIÊNG theo từng nhân viên (lưu trong Employee.shiftOverride JSON, cạnh
// checkInTime/checkOutTime/lateRules...) — thêm 26/8/2026 theo yêu cầu: khai báo ngay lúc tạo/sửa
// nhân viên xem người này CÓ tăng ca không. Mặc định otEnabled=false — nhân viên KHÔNG được tính
// tăng ca cho tới khi admin bật lên. Khi bật và không dùng mặc định công ty, giờ tăng ca được khai
// báo TRỰC TIẾP như 1 ca làm việc thật (giờ vào/giờ ra — giống hệt input check-in/check-out của ca
// chính) thay vì 1 con số "đệm bao nhiêu phút" — linh hoạt hơn, và cho phép "tăng ca có kiểm soát"
// (đặt luôn giờ ra tăng ca để chặn trần) hoặc để trống giờ ra = mở, tính theo giờ chấm công ra thật
// (26/8/2026, phản hồi 2).
export interface EmployeeOvertimeOverride {
  otEnabled?: boolean; // nhân viên này có được tính tăng ca không — mặc định false
  useDefaultOt?: boolean; // true (mặc định) = dùng ngưỡng phút chung của công ty (mở, không chặn trần)
  otStartTime?: string; // "HH:MM" — giờ tăng ca bắt đầu tính (chỉ dùng khi useDefaultOt === false)
  otEndTime?: string | null; // "HH:MM" — tùy chọn: có thì tăng ca bị CHẶN TRẦN tại giờ này ("tăng ca có kiểm soát")
}

function hhmmToMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export interface OvertimeThreshold {
  startMinutesFromShiftEnd: number; // giờ tăng ca bắt đầu, tính bằng số phút SAU giờ tan ca (đã xử lý qua ngày)
  capMinutes?: number; // nếu có: số phút tăng ca tối đa được trả (giờ ra tăng ca − giờ vào tăng ca)
}

/**
 * Xác định ngưỡng/khung giờ tính tăng ca cho 1 nhân viên cụ thể, hoặc `null` nếu nhân viên này
 * chưa bật tăng ca (otEnabled !== true) — khi đó KHÔNG tính tăng ca dù ra muộn bao nhiêu.
 */
export function resolveOvertimeThreshold(
  companyCfg: OvertimeConfig,
  employeeOverride: EmployeeOvertimeOverride | null | undefined,
  checkOutTimeHHMM: string
): OvertimeThreshold | null {
  if (!employeeOverride?.otEnabled) return null;

  if (employeeOverride.useDefaultOt === false && employeeOverride.otStartTime) {
    const shiftEndMin = hhmmToMinutes(checkOutTimeHHMM) ?? 0;
    const otStartMin = hhmmToMinutes(employeeOverride.otStartTime);
    if (otStartMin === null) return { startMinutesFromShiftEnd: companyCfg.minMinutes };

    let startMinutesFromShiftEnd = otStartMin - shiftEndMin;
    // Ca đêm/qua nửa đêm — đưa về khoảng gần nhất quanh giờ tan ca (vd tan ca 22:30, tăng ca
    // bắt đầu 00:00 → +90 phút, không phải -1350 phút).
    if (startMinutesFromShiftEnd < -720) startMinutesFromShiftEnd += 1440;
    if (startMinutesFromShiftEnd > 720) startMinutesFromShiftEnd -= 1440;

    let capMinutes: number | undefined;
    const otEndMin = hhmmToMinutes(employeeOverride.otEndTime);
    if (otEndMin !== null) {
      let span = otEndMin - otStartMin;
      if (span < 0) span += 1440;
      capMinutes = span;
    }
    return { startMinutesFromShiftEnd, capMinutes };
  }
  return { startMinutesFromShiftEnd: companyCfg.minMinutes };
}

/**
 * Tính tăng ca khi check-out muộn hơn giờ tan ca (coMinutesDiff = số phút ra muộn so với giờ tan
 * ca, có thể âm). Ra muộn tới `threshold.startMinutesFromShiftEnd` phút → KHÔNG tính là tăng ca
 * (đây là khoảng nghỉ/đệm trước khi tăng ca thật sự bắt đầu, vd ăn tối — KHÔNG được trả lương).
 * Ra muộn hơn ngưỡng → tăng ca được tính TỪ MỐC NGƯỠNG trở đi (trừ đi phần đệm, không trả cho
 * khoảng nghỉ), và bị chặn trần ở `threshold.capMinutes` nếu nhân viên có khai báo giờ ra tăng ca.
 */
export function computeCheckoutOvertime(
  coMinutesDiff: number,
  cfg: OvertimeConfig,
  baseSalary: number | null | undefined,
  standardWorkDays: number | null | undefined,
  isWeekend: boolean,
  threshold: OvertimeThreshold
): OvertimeComputeResult {
  let minutesOvertime = coMinutesDiff > threshold.startMinutesFromShiftEnd
    ? coMinutesDiff - threshold.startMinutesFromShiftEnd
    : 0;
  if (threshold.capMinutes !== undefined) minutesOvertime = Math.min(minutesOvertime, threshold.capMinutes);
  if (minutesOvertime <= 0) return { minutesOvertime: 0, overtimeAmount: 0 };

  const multiplier = isWeekend ? cfg.weekend : cfg.weekday;
  const dailyRate = (baseSalary ?? 0) / (standardWorkDays ?? 26);
  const hourlyRate = dailyRate / 8;
  const overtimeAmount = Math.floor(hourlyRate * (minutesOvertime / 60) * multiplier);

  return { minutesOvertime, overtimeAmount };
}
