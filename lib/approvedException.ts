import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, calculateEarlyLeave, filterApplicableRules } from "@/lib/attendance";
import { parseShiftSessions, findDayOverride, dateStringToVNInstant } from "@/lib/shiftResolve";

export interface ApprovedTimeOverride {
  lateArrivalTime: string | null; // "HH:MM" — nhân viên xin đến muộn, sếp đã duyệt tới giờ này vẫn tính "Đúng giờ"
  earlyLeaveTime: string | null; // "HH:MM" — nhân viên xin về sớm, sếp đã duyệt từ giờ này vẫn tính "Đúng giờ"
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

  let lateArrivalTime: string | null = null;
  let earlyLeaveTime: string | null = null;
  for (const r of rows) {
    if (r.kind === "late_arrival") lateArrivalTime = r.leaveTime;
    else earlyLeaveTime = r.leaveTime;
  }
  return { lateArrivalTime, earlyLeaveTime };
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
    if (log.checkInAt) {
      const checkInTime = approvedOverride.lateArrivalTime ?? sessionCfg?.checkInTime ?? dayOverride?.checkInTime ?? shiftData.checkInTime ?? employee.branch.checkInTime;
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
    if (log.checkOutAt) {
      const checkOutTime = approvedOverride.earlyLeaveTime ?? sessionCfg?.checkOutTime ?? dayOverride?.checkOutTime ?? shiftData.checkOutTime ?? employee.branch.checkOutTime;
      const coGracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const earlyRules = filterApplicableRules(employee.company.penaltyRules, employee, log.checkOutAt)
        .filter((r) => r.type === "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
      ({ minutesEarly, earlyLeavePenalty } = calculateEarlyLeave(log.checkOutAt, checkOutTime, coGracePeriod, earlyRules));
    }

    const penaltyAmount = latePenalty + earlyLeavePenalty;
    const lateArrivalApproved = log.checkInAt ? !!approvedOverride.lateArrivalTime : false;
    const earlyLeaveApproved = log.checkOutAt ? !!approvedOverride.earlyLeaveTime : false;

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
