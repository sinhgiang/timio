// Xác định giờ vào ca dự kiến cho 1 lần check-in, tôn trọng:
//  1) Lịch phân ca theo ngày (ShiftAssignment) — ca gần giờ check-in nhất; "Nghỉ" → không phạt
//  2) Giờ riêng của nhân viên (shiftOverride) → mặc định chi nhánh
//  3) Ngày lễ — nếu ngày lễ đó KHÔNG bật "vẫn phạt" thì bỏ qua phạt trễ
// Hàm THUẦN (không đụng DB) để test được và dùng chung cho cả 4 luồng check-in.

export interface ResolvedShift {
  checkInTime: string; // "HH:MM" — giờ dùng để tính trễ
  gracePeriod: number;
  suppressPenalty: boolean; // true → không tính muộn / không phạt (ngày nghỉ theo ca, hoặc ngày lễ không phạt)
  reason: "roster_off" | "holiday_no_penalty" | null;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function resolveShift(p: {
  now: Date; // giờ server thực (UTC)
  branchCheckInTime: string;
  branchGracePeriod: number;
  shiftOverrideRaw: string | null; // Employee.shiftOverride (JSON string) — có thể null
  todaysAssignments: { shiftLabel: string; checkIn: string }[]; // ShiftAssignment của NV cho hôm nay
  holiday: { penalizeLate: boolean } | null; // Holiday của công ty cho hôm nay (null = không phải lễ)
}): ResolvedShift {
  let ov: { checkInTime?: string; gracePeriod?: number } = {};
  if (p.shiftOverrideRaw) {
    try { ov = JSON.parse(p.shiftOverrideRaw); } catch { ov = {}; }
  }
  const gracePeriod = Number.isFinite(ov.gracePeriod) ? Number(ov.gracePeriod) : p.branchGracePeriod;
  let checkInTime = ov.checkInTime ?? p.branchCheckInTime;
  let suppressPenalty = false;
  let reason: ResolvedShift["reason"] = null;

  // 1) Lịch phân ca theo ngày (nếu có)
  const assigns = p.todaysAssignments ?? [];
  const workShifts = assigns.filter((a) => a.shiftLabel !== "Nghỉ" && toMinutes(a.checkIn) !== null);
  if (assigns.length > 0 && workShifts.length === 0) {
    // Hôm nay được xếp "Nghỉ" → không phạt
    suppressPenalty = true;
    reason = "roster_off";
  } else if (workShifts.length > 0) {
    // Chọn ca có giờ vào gần giờ check-in hiện tại nhất
    const vn = new Date(p.now.getTime() + 7 * 3600 * 1000);
    const nowMin = vn.getUTCHours() * 60 + vn.getUTCMinutes();
    let best = workShifts[0].checkIn;
    let bestDiff = Math.abs(nowMin - (toMinutes(best) as number));
    for (const a of workShifts) {
      const diff = Math.abs(nowMin - (toMinutes(a.checkIn) as number));
      if (diff < bestDiff) { best = a.checkIn; bestDiff = diff; }
    }
    checkInTime = best;
  }

  // 2) Ngày lễ — không phạt trừ khi ngày lễ đó bật "vẫn phạt"
  if (p.holiday && !p.holiday.penalizeLate) {
    suppressPenalty = true;
    if (!reason) reason = "holiday_no_penalty";
  }

  return { checkInTime, gracePeriod, suppressPenalty, reason };
}

// ─── Ca gãy nhiều buổi/ngày (vd: sáng 8h-10h30, tối 16h-22h30) ──────────────────
// Chỉ áp dụng cho nhân viên có Employee.shiftOverride.sessions (mảng >=2 phần tử).
// Với nhân viên bình thường (không có sessions), toàn bộ luồng check-in giữ NGUYÊN
// hành vi cũ — các hàm dưới đây chỉ được gọi thêm khi parseShiftSessions() trả về non-null.

export interface ShiftSession {
  label: string; // "Sáng" | "Tối" | ... — hiển thị cho nhân viên biết đang chấm buổi nào
  checkInTime: string; // HH:MM
  checkOutTime: string; // HH:MM
  gracePeriod?: number;
}

/** Đọc Employee.shiftOverride, trả về mảng sessions nếu nhân viên này là ca gãy nhiều buổi, ngược lại null. */
export function parseShiftSessions(shiftOverrideRaw: string | null | undefined): ShiftSession[] | null {
  if (!shiftOverrideRaw) return null;
  try {
    const ov = JSON.parse(shiftOverrideRaw) as { sessions?: ShiftSession[] };
    if (Array.isArray(ov.sessions) && ov.sessions.length >= 2) {
      const valid = ov.sessions.filter((s) => s && typeof s.checkInTime === "string" && typeof s.checkOutTime === "string");
      if (valid.length >= 2) return valid;
    }
  } catch { /* not JSON / không có sessions */ }
  return null;
}

// ─── Ngày làm khác (day override) ───────────────────────────────────────────────
// Cho phép 1 nhân viên (kể cả ca gãy 2 buổi) có 1-2 ngày/tuần làm CA BÌNH THƯỜNG
// (1 khoảng giờ vào/ra, không tách buổi) khác với lịch chung — vd: nhân viên ca gãy
// nhưng cứ thứ 5 phải thay ca nguyên ngày cho đồng nghiệp nghỉ. Đây là quy tắc LẶP LẠI
// theo THỨ TRONG TUẦN (khác "Lịch phân ca"/ShiftAssignment vốn theo TỪNG NGÀY cụ thể).

export interface DayOverride {
  day: number; // 0=CN, 1=T2 ... 6=T7 (giờ VN) — khớp với DAYS ở EmployeesClient.tsx
  checkInTime: string;
  checkOutTime: string;
  gracePeriod?: number;
}

/** Đọc Employee.shiftOverride.dayOverrides — trả về override khớp THỨ (giờ VN) của `at`, nếu có. */
export function findDayOverride(shiftOverrideRaw: string | null | undefined, at: Date): DayOverride | null {
  if (!shiftOverrideRaw) return null;
  try {
    const ov = JSON.parse(shiftOverrideRaw) as { dayOverrides?: DayOverride[] };
    if (!Array.isArray(ov.dayOverrides) || ov.dayOverrides.length === 0) return null;
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const dow = new Date(at.getTime() + VN_OFFSET_MS).getUTCDay();
    return (
      ov.dayOverrides.find(
        (d) => d && d.day === dow && typeof d.checkInTime === "string" && typeof d.checkOutTime === "string"
      ) ?? null
    );
  } catch {
    return null;
  }
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Chọn buổi (session) mà lần quét hiện tại nên tác động vào.
 *  - Nếu mọi buổi đã xong (đủ check-in + check-out) → trả về buổi gần giờ hiện tại nhất,
 *    để route báo "đã chấm công đủ hôm nay".
 *  - Nếu đang có buổi dở dang (đã check-in, chưa check-out) → luôn cho phép check-out buổi đó
 *    bất kể giờ nào (tránh nhân viên bị kẹt nếu ra trễ).
 *  - Buổi CHƯA bắt đầu chỉ được chọn để check-in nếu giờ quét nằm trong khung [giờ vào - 2h, giờ ra + 2h] —
 *    tránh quét nhầm giữa giờ nghỉ (vd 11h trưa, giữa buổi sáng và buổi tối) bị ghi nhận sai thành
 *    check-in buổi tối. Trả về null nếu không có buổi nào hợp lý — route nên báo lỗi rõ ràng.
 * Trả về index trong mảng `sessions` — dùng làm giá trị cột AttendanceLog.session (String(index)).
 */
export function pickActiveSession(
  sessions: ShiftSession[],
  now: Date,
  logsBySessionKey: Map<string, { checkOutAt: Date | null }>
): number | null {
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowVNMinutes = Math.floor(((now.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
  const closest = (pool: number[]) => {
    let best = pool[0];
    let bestDiff = Math.abs(nowVNMinutes - hhmmToMinutes(sessions[best].checkInTime));
    for (const i of pool) {
      const diff = Math.abs(nowVNMinutes - hhmmToMinutes(sessions[i].checkInTime));
      if (diff < bestDiff) { best = i; bestDiff = diff; }
    }
    return best;
  };

  const indices = sessions.map((_, i) => i);
  const incomplete = indices.filter((i) => {
    const log = logsBySessionKey.get(String(i));
    return !log || !log.checkOutAt;
  });
  if (incomplete.length === 0) return closest(indices); // đã xong hết — báo "đủ hôm nay"

  const WINDOW_MIN = 120;
  const withinWindow = incomplete.filter((i) => {
    if (logsBySessionKey.has(String(i))) return true; // đang dở dang (chờ check-out) — luôn hợp lệ
    const inMin = hhmmToMinutes(sessions[i].checkInTime);
    const outMin = hhmmToMinutes(sessions[i].checkOutTime);
    return nowVNMinutes >= inMin - WINDOW_MIN && nowVNMinutes <= outMin + WINDOW_MIN;
  });
  if (withinWindow.length === 0) return null;
  return closest(withinWindow);
}
