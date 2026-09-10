// Cấu hình tăng ca (Company.overtimeRates — JSON-in-TEXT, tái dùng field đã có sẵn, không cần
// migration DB). Hàm ở đây gom logic tính tăng ca đang bị lặp lại ở 3 route check-out
// (checkin-face/checkin-qr/checkin).
//
// LỊCH SỬ: bản đầu (25/8/2026) có thêm "ngưỡng phút tối thiểu" (minMinutes) — ra muộn hơn giờ
// tan ca trên N phút mới tự động tính là tăng ca, mốc bắt đầu do hệ thống SUY RA (giờ tan ca +
// ngưỡng). Sau đó (26/8/2026) có thêm lựa chọn khai báo trực tiếp giờ vào/ra tăng ca riêng theo
// từng NV, nhưng vẫn giữ ngưỡng công ty làm "mặc định" nếu NV không tự khai báo.
// Bỏ hẳn mô hình ngưỡng/mặc định này (10/9/2026, phản hồi: không thích kiểu suy ra tự động, muốn
// khai báo tăng ca y hệt 1 mốc giờ ca bình thường — CÓ giờ vào, CÓ giờ ra, cho từng NV) — giờ đây
// Company.overtimeRates CHỈ còn giữ hệ số lương (weekday/weekend); còn "tăng ca bắt đầu/kết thúc
// lúc mấy giờ" bắt buộc khai báo riêng cho từng NV ở Employee.shiftOverride (xem
// EmployeeOvertimeOverride bên dưới) — NV nào chưa khai báo giờ thì KHÔNG được tính tăng ca, dù
// bật otEnabled hay ra muộn bao nhiêu.
export interface OvertimeConfig {
  weekday: number; // hệ số lương tăng ca ngày thường (vd 1.5 = 150%)
  weekend: number; // hệ số lương tăng ca cuối tuần (vd 2.0 = 200%)
}

export const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  weekday: 1.5,
  weekend: 2.0,
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
  };
}

export interface OvertimeComputeResult {
  minutesOvertime: number;
  overtimeAmount: number;
}

// Cấu hình tăng ca RIÊNG theo từng nhân viên (lưu trong Employee.shiftOverride JSON, cạnh
// checkInTime/checkOutTime/lateRules...) — thêm 26/8/2026 theo yêu cầu: khai báo ngay lúc tạo/sửa
// nhân viên xem người này CÓ tăng ca không. Mặc định otEnabled=false — nhân viên KHÔNG được tính
// tăng ca cho tới khi admin bật lên. Khi bật, giờ tăng ca được khai báo TRỰC TIẾP như 1 ca làm
// việc thật (giờ vào/giờ ra — giống hệt input check-in/check-out của ca chính) thay vì 1 con số
// "đệm bao nhiêu phút" — otEndTime bỏ trống = mở (tính theo giờ chấm công ra thật), có giá trị =
// chặn trần ("tăng ca có kiểm soát"). Xem lib/overtime.ts (resolveOvertimeThreshold) — nơi 3
// route check-out đọc lại field này.
export interface EmployeeOvertimeOverride {
  otEnabled?: boolean; // nhân viên này có được tính tăng ca không — mặc định false
  otStartTime?: string; // "HH:MM" — giờ tăng ca bắt đầu tính. BẮT BUỘC phải có mới tính được tăng ca.
  otEndTime?: string | null; // "HH:MM" — tùy chọn: có thì tăng ca bị CHẶN TRẦN tại giờ này ("tăng ca có kiểm soát")
  // Dung sai (phút) quanh 2 mốc trên (10/9/2026, phản hồi: "bản ghi chụp công có thể sớm hơn hoặc
  // muộn hơn... vẫn lọt vào bên trong"). Chấm ra SỚM hơn otStartTime tối đa ngần này phút vẫn
  // được tính như đã chạm mốc bắt đầu tăng ca (khớp cảm giác "chụp công xong đi ra" thường trễ
  // vài phút so với lúc thực sự ngừng việc); chấm ra MUỘN hơn otEndTime (nếu có khai báo trần)
  // tối đa ngần này phút vẫn được trả đủ, không bị cắt cụt vì thao tác chấm công chậm vài phút.
  otGracePeriod?: number;
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
 * Xác định khung giờ tính tăng ca cho 1 nhân viên cụ thể, hoặc `null` nếu nhân viên này chưa bật
 * tăng ca (otEnabled !== true) HOẶC chưa khai báo giờ vào tăng ca (otStartTime) — cả 2 trường hợp
 * đều KHÔNG tính tăng ca dù ra muộn bao nhiêu (không còn "ngưỡng mặc định công ty" để rơi về nữa).
 */
export function resolveOvertimeThreshold(
  employeeOverride: EmployeeOvertimeOverride | null | undefined,
  checkOutTimeHHMM: string
): OvertimeThreshold | null {
  if (!employeeOverride?.otEnabled) return null;

  const shiftEndMin = hhmmToMinutes(checkOutTimeHHMM) ?? 0;
  const otStartMin = hhmmToMinutes(employeeOverride.otStartTime);
  if (otStartMin === null) return null; // chưa khai báo giờ vào tăng ca → không tính

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

  // Dung sai: chấm ra sớm hơn mốc bắt đầu tối đa `grace` phút vẫn coi như đã chạm mốc (hạ
  // ngưỡng xuống) — và nếu có chặn trần, chấm ra muộn hơn mốc kết thúc tối đa `grace` phút
  // vẫn được trả đủ (nới trần lên tương ứng).
  const grace = Math.round(clampNumber(employeeOverride.otGracePeriod, 0, 0, 60));
  if (grace > 0) {
    startMinutesFromShiftEnd -= grace;
    if (capMinutes !== undefined) capMinutes += grace;
  }

  return { startMinutesFromShiftEnd, capMinutes };
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
