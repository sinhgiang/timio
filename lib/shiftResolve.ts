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
