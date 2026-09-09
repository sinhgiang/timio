import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, calculateEarlyLeave, filterApplicableRules } from "@/lib/attendance";
import { parseShiftSessions, findDayOverride, dateStringToVNInstant } from "@/lib/shiftResolve";

export interface ApprovedTimeOverride {
  lateArrivalTime: string | null; // "HH:MM" — nhân viên xin đến muộn, sếp đã duyệt tới giờ này vẫn tính "Đúng giờ". Tương thích ngược: giá trị của đơn late_arrival CUỐI CÙNG trong ngày — đúng cho >99% trường hợp (NV ca thường chỉ có tối đa 1 đơn/ngày). Ca gãy (nhiều buổi/ngày) có thể có NHIỀU đơn cùng loại/ngày — dùng lateArrivalRows + pickApprovedTime() thay vì field này.
  earlyLeaveTime: string | null; // tương tự, cho "về sớm"
  lateArrivalRows: { leaveTime: string }[]; // TẤT CẢ đơn late_arrival đã duyệt trong ngày (thường 0-1 dòng, ca gãy có thể nhiều hơn — mỗi buổi 1 đơn)
  earlyLeaveRows: { leaveTime: string }[];
}

/**
 * Ca gãy (nhiều buổi/ngày, vd sáng+tối — xem lib/shiftResolve.ts parseShiftSessions): nhân viên có
 * thể có NHIỀU đơn cùng loại (vd 2 đơn "xin đến muộn", 1 cho buổi sáng 1 cho buổi tối) đã duyệt
 * trong CÙNG 1 ngày. Nếu chỉ lấy 1 giá trị chung cho cả ngày (như lateArrivalTime/earlyLeaveTime ở
 * trên) thì đơn xin cho buổi này sẽ VÔ TÌNH lan sang miễn phạt luôn buổi kia — SAI, vì 2 buổi độc
 * lập nhau. Hàm này chọn đúng đơn ứng với buổi đang xét, bằng cách so giờ đã xin (leaveTime) với
 * giờ CHUẨN của buổi đó (anchorTime, vd sessionCfg.checkInTime) — đơn nào gần giờ chuẩn buổi này
 * nhất thì áp cho buổi này. Khi chỉ có 0 hoặc 1 đơn (đa số công ty — ca thường, 1 buổi/ngày) hàm
 * này cho kết quả giống hệt như đọc thẳng lateArrivalTime/earlyLeaveTime, không đổi hành vi cũ.
 */
export function pickApprovedTime(rows: { leaveTime: string }[], anchorTime: string): string | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0].leaveTime;
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const anchorMin = toMinutes(anchorTime);
  return rows.reduce((best, r) =>
    Math.abs(toMinutes(r.leaveTime) - anchorMin) < Math.abs(toMinutes(best.leaveTime) - anchorMin) ? r : best
  ).leaveTime;
}

/**
 * Đơn "xin về sớm / xin đến muộn" (EarlyLeaveRequest, phân biệt bằng field `kind`) mà nhân viên
 * tự tạo trong app (/ho-so hoặc mobile) và ĐÃ ĐƯỢC SẾP DUYỆT cho đúng ngày này — trả về giờ đã
 * xin để dùng làm mốc "giờ chuẩn" thay cho giờ ca bình thường khi tính trạng thái chấm công.
 *
 * Đây là chỗ hiện thực yêu cầu "tự động hoạt động, không cần sếp sửa tay lại": vì
 * calculateCheckInStatus/calculateEarlyLeave (lib/attendance.ts) là hàm THUẦN nhận
 * `scheduledTime` bất kỳ, chỉ cần đưa giờ đã duyệt vào làm scheduledTime là NV chấm công đúng
 * như đã xin sẽ tự động ra "Đúng giờ", không bị trừ tiền — không cần sửa gì trong 2 hàm đó.
 * Ưu tiên CAO NHẤT trong chuỗi sessionCfg?.X ?? dayOverride?.X ?? shiftData.X ?? branch.X ở
 * TẤT CẢ 5 nơi tính chấm công (checkin-face, checkin, checkin-qr, admin-edit, recalculate) —
 * đơn xin phép cho 1 NGÀY CỤ THỂ phải thắng cả lịch phân ca/ca gãy vốn là quy luật LẶP LẠI.
 *
 * Dùng chung cho mọi công ty (chỉ lọc theo employeeId+date, không hardcode company/employee nào).
 */
export async function getApprovedTimeOverride(employeeId: string, date: string): Promise<ApprovedTimeOverride> {
  const rows = await prisma.earlyLeaveRequest.findMany({
    where: { employeeId, date, status: "approved" },
    select: { kind: true, leaveTime: true },
  });

  const lateArrivalRows = rows.filter((r) => r.kind === "late_arrival");
  const earlyLeaveRows = rows.filter((r) => r.kind !== "late_arrival");
  return {
    lateArrivalTime: lateArrivalRows.length > 0 ? lateArrivalRows[lateArrivalRows.length - 1].leaveTime : null,
    earlyLeaveTime: earlyLeaveRows.length > 0 ? earlyLeaveRows[earlyLeaveRows.length - 1].leaveTime : null,
    lateArrivalRows,
    earlyLeaveRows,
  };
}

/**
 * Tính lại (và ghi đè) các AttendanceLog ĐÃ CÓ SẴN của 1 nhân viên trong 1 ngày, ngay tại
 * THỜI ĐIỂM SẾP DUYỆT đơn "xin về sớm/đến muộn". Đây là mảnh còn thiếu so với
 * getApprovedTimeOverride() ở trên: hàm đó chỉ tự động đúng cho lần chấm công XẢY RA SAU khi
 * đơn đã được duyệt (checkin-face/checkin/checkin-qr/admin-edit/recalculate đọc đơn trước khi
 * tính). Nếu nhân viên chấm công RỒI SẾP MỚI DUYỆT thì log cũ đã lỡ bị tính phạt — phải chủ
 * động sửa lại log đó ngay khi duyệt, đúng yêu cầu "tự áp xếp, tự sửa bên trong, không cần sếp
 * sửa tay lại". Gọi hàm này ở CẢ 2 nơi duyệt đơn (web + mobile) sau khi set status="approved".
 *
 * Dùng chung cho mọi công ty (chỉ lọc theo employeeId+date, không hardcode company/employee nào).
 */
export async function recomputeAttendanceLogsForApproval(employeeId: string, date: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { branch: true, company: { include: { penaltyRules: true } } },
  });
  if (!employee) return;

  const logs = await prisma.attendanceLog.findMany({ where: { employeeId, date } });
  if (logs.length === 0) return; // Chưa có log nào (chưa chấm công) — không có gì để sửa, getApprovedTimeOverride() sẽ tự lo khi NV chấm công sau này.

  const approvedOverride = await getApprovedTimeOverride(employeeId, date);
  const shiftData = employee.shiftOverride
    ? (JSON.parse(employee.shiftOverride) as { checkInTime?: string; checkOutTime?: string; gracePeriod?: number })
    : {};
  const sessions = parseShiftSessions(employee.shiftOverride);

  for (const log of logs) {
    const sessionKey = log.session;
    const sessionCfg = sessions && sessionKey !== "full" ? sessions[Number(sessionKey)] ?? null : null;
    const dayOverride = sessionKey === "full"
      ? findDayOverride(employee.shiftOverride, log.checkInAt ?? log.checkOutAt ?? dateStringToVNInstant(date))
      : null;

    let status = log.status;
    let minutesLate = log.minutesLate;
    let latePenalty = 0;
    let pickedLateArrival: string | null = null;
    if (log.checkInAt) {
      const fallbackCheckInTime = sessionCfg?.checkInTime ?? dayOverride?.checkInTime ?? shiftData.checkInTime ?? employee.branch.checkInTime;
      // Ca gãy có thể có nhiều đơn "đến muộn" cùng ngày (1 đơn/buổi) — chọn đúng đơn ứng với BUỔI
      // của log này (gần giờ chuẩn buổi này nhất), tránh đơn xin cho buổi khác lan sang miễn phạt
      // nhầm. Xem pickApprovedTime().
      pickedLateArrival = pickApprovedTime(approvedOverride.lateArrivalRows, fallbackCheckInTime);
      const checkInTime = pickedLateArrival ?? fallbackCheckInTime;
      const gracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const lateRules = filterApplicableRules(employee.company.penaltyRules, employee, log.checkInAt)
        .filter((r) => r.type !== "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
      const result = calculateCheckInStatus(log.checkInAt, checkInTime, gracePeriod, lateRules);
      status = result.status;
      minutesLate = result.minutesLate;
      latePenalty = result.penaltyAmount;
    }

    let minutesEarly = 0;
    let earlyLeavePenalty = 0;
    let pickedEarlyLeave: string | null = null;
    if (log.checkOutAt) {
      const fallbackCheckOutTime = sessionCfg?.checkOutTime ?? dayOverride?.checkOutTime ?? shiftData.checkOutTime ?? employee.branch.checkOutTime;
      pickedEarlyLeave = pickApprovedTime(approvedOverride.earlyLeaveRows, fallbackCheckOutTime);
      const checkOutTime = pickedEarlyLeave ?? fallbackCheckOutTime;
      const coGracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const earlyRules = filterApplicableRules(employee.company.penaltyRules, employee, log.checkOutAt)
        .filter((r) => r.type === "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
      ({ minutesEarly, earlyLeavePenalty } = calculateEarlyLeave(log.checkOutAt, checkOutTime, coGracePeriod, earlyRules));
    }

    const penaltyAmount = latePenalty + earlyLeavePenalty;
    const lateArrivalApproved = log.checkInAt ? !!pickedLateArrival : false;
    const earlyLeaveApproved = log.checkOutAt ? !!pickedEarlyLeave : false;

    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: { status, minutesLate, minutesEarly, earlyLeavePenalty, penaltyAmount, lateArrivalApproved, earlyLeaveApproved },
    });
  }

  // Recompute MonthlySummary tháng đó — khớp logic admin-edit/route.ts (đếm theo NGÀY, không
  // đếm theo số dòng log, vì NV ca gãy có thể có >1 dòng/ngày).
  const [y, m] = date.split("-").map(Number);
  const monthLogs = await prisma.attendanceLog.findMany({
    where: { employeeId, date: { startsWith: `${y}-${String(m).padStart(2, "0")}` } },
  });
  const byDate = new Map<string, typeof monthLogs>();
  for (const l of monthLogs) {
    const arr = byDate.get(l.date) ?? [];
    arr.push(l);
    byDate.set(l.date, arr);
  }
  let daysPresent = 0, daysLate = 0, totalMinutesLate = 0, totalPenalty = 0;
  for (const dayLogs of Array.from(byDate.values())) {
    if (dayLogs.some((l) => l.status !== "absent" && l.checkInAt)) daysPresent++;
    if (dayLogs.some((l) => l.minutesLate > 0)) daysLate++;
    totalMinutesLate += dayLogs.reduce((s, l) => s + l.minutesLate, 0);
    totalPenalty += dayLogs.reduce((s, l) => s + l.penaltyAmount, 0);
  }

  await prisma.monthlySummary.upsert({
    where: { employeeId_year_month: { employeeId, year: y, month: m } },
    create: { employeeId, year: y, month: m, daysPresent, daysLate, totalMinutesLate, totalPenalty },
    update: { daysPresent, daysLate, totalMinutesLate, totalPenalty },
  });
}
