import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, filterApplicableRules, type LateRule } from "@/lib/attendance";
import { computeCheckoutOvertime, sanitizeOvertimeConfig, resolveOvertimeMinMinutes, type EmployeeOvertimeOverride } from "@/lib/overtime";
import { resolveShift, parseShiftSessions, pickActiveSession, findDayOverride, type ShiftSession } from "@/lib/shiftResolve";
import { getTodayString } from "@/lib/utils";
import { sendTelegram, buildLateAlert } from "@/lib/telegram";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, lat, lng } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: true,
        company: { include: { penaltyRules: true } },
      },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
    }

    // Kiểm tra IP whitelist nếu chi nhánh đã cấu hình
    if (employee.branch.allowedIPs) {
      try {
        const allowed = JSON.parse(employee.branch.allowedIPs as string) as string[];
        if (allowed.length > 0) {
          const clientIP = getClientIP(req);
          if (!allowed.includes(clientIP)) {
            return NextResponse.json({
              error: `Check-in từ IP ${clientIP} không được phép. Vui lòng check-in tại văn phòng.`,
            }, { status: 403 });
          }
        }
      } catch { /* ignore parse error */ }
    }

    // Kiểm tra GPS nếu chi nhánh đã cấu hình tọa độ
    if (employee.branch.lat !== null && employee.branch.lng !== null) {
      if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return NextResponse.json({
          error: "Không lấy được vị trí GPS. Vui lòng cho phép truy cập vị trí và thử lại.",
        }, { status: 403 });
      }
      const distance = haversineDistance(lat, lng, employee.branch.lat, employee.branch.lng);
      const radius = employee.branch.gpsRadius ?? 200;
      if (distance > radius) {
        return NextResponse.json({
          error: `Bạn đang ở ngoài phạm vi văn phòng (${Math.round(distance)}m, cho phép ${radius}m). Vui lòng đến văn phòng để chấm công.`,
        }, { status: 403 });
      }
    }

    const today = getTodayString();
    const now = new Date();

    // Ngày làm khác (vd nhân viên ca gãy nhưng cứ thứ 5 làm ca bình thường thay đồng nghiệp)
    // → hôm nay bỏ qua sessions, chấm công như 1 ca thường (session "full") với giờ riêng của ngày này.
    const dayOverride = findDayOverride(employee.shiftOverride, now);

    // Ca gãy nhiều buổi/ngày (vd sáng + tối) — xem lib/shiftResolve.ts. Nhân viên bình thường
    // (không có sessions) đi qua nhánh else, hành vi giữ nguyên như trước.
    const sessions = dayOverride ? null : parseShiftSessions(employee.shiftOverride);
    let session = "full";
    let sessionCfg: ShiftSession | null = null;
    let isFirstLogOfDay = true;
    let existingLog: Awaited<ReturnType<typeof prisma.attendanceLog.findUnique>> = null;

    if (sessions) {
      const todaysLogs = await prisma.attendanceLog.findMany({ where: { employeeId, date: today } });
      isFirstLogOfDay = todaysLogs.length === 0;
      const logsBySessionKey = new Map(todaysLogs.map((l) => [l.session, { checkOutAt: l.checkOutAt }]));
      const idx = pickActiveSession(sessions, now, logsBySessionKey);
      if (idx === null) {
        const list = sessions.map((s) => `${s.label} ${s.checkInTime}–${s.checkOutTime}`).join(", ");
        return NextResponse.json({ error: `Chưa đến giờ chấm công. Ca hôm nay: ${list}` }, { status: 400 });
      }
      session = String(idx);
      sessionCfg = sessions[idx];
      existingLog = todaysLogs.find((l) => l.session === session) ?? null;
    } else {
      existingLog = await prisma.attendanceLog.findUnique({
        where: { employeeId_date_session: { employeeId, date: today, session } },
      });
    }

    if (existingLog) {
      if (existingLog.checkOutAt) {
        return NextResponse.json(
          { error: "Bạn đã chấm công đủ hôm nay" },
          { status: 400 }
        );
      }
      // Check-out — tính tăng ca nếu ra muộn hơn giờ tan ca
      let shiftData: { checkOutTime?: string } & EmployeeOvertimeOverride = {};
      try {
        shiftData = employee.shiftOverride ? JSON.parse(employee.shiftOverride) : {};
      } catch { shiftData = {}; }
      const checkOutTime = sessionCfg?.checkOutTime ?? dayOverride?.checkOutTime ?? shiftData.checkOutTime ?? employee.branch.checkOutTime;
      const coGracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? employee.branch.gracePeriod ?? 5;
      const [coH, coM] = checkOutTime.split(":").map(Number);
      // Compare in Vietnam time to avoid UTC server bias
      const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
      const nowVNMinutes = Math.floor(((now.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
      const coScheduledMinutes = coH * 60 + coM;
      let coMinutesDiff = nowVNMinutes - coScheduledMinutes;
      if (coMinutesDiff < -720) coMinutesDiff += 1440;

      // Tính tiền tăng ca: (lương CB / số ngày công chuẩn / 8 giờ) * giờ OT * hệ số.
      // Có ngưỡng phút tối thiểu (minMinutes) — ra muộn vài phút không tính là tăng ca.
      const overtimeCfg = sanitizeOvertimeConfig(
        employee.company.overtimeRates ? JSON.parse(employee.company.overtimeRates) : null
      );
      const dayOfWeek = now.getDay(); // 0=CN, 6=T7
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      // Chỉ tính tăng ca nếu nhân viên này đã được BẬT tăng ca khi khai báo (mặc định TẮT —
      // xem lib/overtime.ts resolveOvertimeMinMinutes). null = không tính, dù ra muộn bao nhiêu.
      const otMinMinutes = resolveOvertimeMinMinutes(overtimeCfg, shiftData);
      const { minutesOvertime, overtimeAmount } = otMinMinutes === null
        ? { minutesOvertime: 0, overtimeAmount: 0 }
        : computeCheckoutOvertime(
            coMinutesDiff, { ...overtimeCfg, minMinutes: otMinMinutes },
            employee.baseSalary, employee.branch.standardWorkDays, isWeekend
          );

      // Ra sớm: phạt nếu checkout trước giờ tan ca
      const minutesEarly = nowVNMinutes < coScheduledMinutes ? coScheduledMinutes - nowVNMinutes : 0;
      let earlyLeavePenalty = 0;
      if (minutesEarly > coGracePeriod) {
        const earlyRules = filterApplicableRules(employee.company.penaltyRules, employee, now)
          .filter((r) => r.type === "early_leave")
          .sort((a, b) => a.fromMinutes - b.fromMinutes);
        for (const rule of earlyRules) {
          if (minutesEarly >= rule.fromMinutes && minutesEarly <= rule.toMinutes) { earlyLeavePenalty = rule.amount; break; }
          if (minutesEarly > rule.toMinutes) earlyLeavePenalty = rule.amount;
        }
      }

      // Tăng ca: lưu trạng thái "pending" — chỉ tính tiền khi sếp duyệt
      const overtimeStatus = minutesOvertime > 0 ? "pending" : "none";
      await prisma.attendanceLog.update({
        where: { id: existingLog.id },
        data: {
          checkOutAt: now, minutesOvertime, overtimeAmount, overtimeStatus,
          ...(earlyLeavePenalty > 0 && { penaltyAmount: { increment: earlyLeavePenalty } }),
        },
      });
      if (earlyLeavePenalty > 0) {
        await prisma.monthlySummary.upsert({
          where: { employeeId_year_month: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1 } },
          create: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1, totalPenalty: earlyLeavePenalty },
          update: { totalPenalty: { increment: earlyLeavePenalty } },
        });
      }

      const totalPenalty = existingLog.penaltyAmount + earlyLeavePenalty;
      const msgs: string[] = [];
      if (minutesEarly > 0 && earlyLeavePenalty > 0) msgs.push(`Ra sớm ${minutesEarly} phút`);
      if (minutesOvertime > 0) msgs.push(`Tăng ca ${minutesOvertime} phút — chờ duyệt`);
      const prefix = sessionCfg ? `[${sessionCfg.label}] ` : "";
      return NextResponse.json({
        action: "check_out",
        status: existingLog.status,
        minutesLate: existingLog.minutesLate,
        penaltyAmount: totalPenalty,
        minutesEarly,
        earlyLeavePenalty,
        minutesOvertime,
        overtimeAmount,
        message: prefix + (msgs.length > 0 ? `Ra ca · ${msgs.join(" · ")}` : "Ra ca thành công"),
      });
    }

    // Check-in — use per-employee shift override if set, otherwise use branch defaults
    let shiftOverrideParsed: {
      checkInTime?: string;
      gracePeriod?: number;
      useDefaultLate?: boolean;
      lateRules?: Array<{ minutes: number; amount: number }>;
    } = {};
    try {
      shiftOverrideParsed = employee.shiftOverride ? JSON.parse(employee.shiftOverride) : {};
    } catch { shiftOverrideParsed = {}; }
    let shift: { checkInTime: string; gracePeriod: number; suppressPenalty: boolean; reason: "roster_off" | "holiday_no_penalty" | null };
    if (sessionCfg) {
      // Ca gãy nhiều buổi/ngày — dùng giờ riêng của buổi này; Lịch phân ca không áp dụng cho ca gãy
      const todayHoliday = await prisma.holiday.findFirst({ where: { companyId: employee.companyId, date: today }, select: { penalizeLate: true } });
      const holidayNoPenalty = !!(todayHoliday && !todayHoliday.penalizeLate);
      shift = {
        checkInTime: sessionCfg.checkInTime,
        gracePeriod: sessionCfg.gracePeriod ?? employee.branch.gracePeriod,
        suppressPenalty: holidayNoPenalty,
        reason: holidayNoPenalty ? "holiday_no_penalty" : null,
      };
    } else if (dayOverride) {
      // Ngày làm khác — dùng giờ riêng của ngày này; Lịch phân ca không áp dụng (giống ca gãy)
      const todayHoliday = await prisma.holiday.findFirst({ where: { companyId: employee.companyId, date: today }, select: { penalizeLate: true } });
      const holidayNoPenalty = !!(todayHoliday && !todayHoliday.penalizeLate);
      shift = {
        checkInTime: dayOverride.checkInTime,
        gracePeriod: dayOverride.gracePeriod ?? employee.branch.gracePeriod,
        suppressPenalty: holidayNoPenalty,
        reason: holidayNoPenalty ? "holiday_no_penalty" : null,
      };
    } else {
      // Ca theo ngày (Lịch phân ca) + ngày lễ → xác định giờ vào chuẩn + có né phạt không
      const [todaysAssignments, todayHoliday] = await Promise.all([
        prisma.shiftAssignment.findMany({ where: { employeeId, date: today }, select: { shiftLabel: true, checkIn: true } }),
        prisma.holiday.findFirst({ where: { companyId: employee.companyId, date: today }, select: { penalizeLate: true } }),
      ]);
      shift = resolveShift({
        now,
        branchCheckInTime: employee.branch.checkInTime,
        branchGracePeriod: employee.branch.gracePeriod,
        shiftOverrideRaw: employee.shiftOverride,
        todaysAssignments,
        holiday: todayHoliday,
      });
    }

    // Resolve effective late-penalty rules: employee-custom or company-wide
    let effectiveLateRules: LateRule[];
    if (shiftOverrideParsed.useDefaultLate === false) {
      const empRules = shiftOverrideParsed.lateRules ?? [];
      const sorted = [...empRules].sort((a, b) => a.minutes - b.minutes);
      effectiveLateRules = sorted.map((r, i) => ({
        fromMinutes: r.minutes,
        toMinutes: sorted[i + 1] ? sorted[i + 1].minutes - 1 : 9999,
        amount: r.amount,
      }));
    } else {
      effectiveLateRules = filterApplicableRules(employee.company.penaltyRules, employee, now)
        .filter((r) => r.type !== "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
    }

    let { status, minutesLate, penaltyAmount, message } =
      calculateCheckInStatus(
        now,
        shift.checkInTime,
        shift.gracePeriod,
        effectiveLateRules
      );

    // Ngày nghỉ theo ca / ngày lễ không phạt → xoá trễ + phạt
    if (shift.suppressPenalty) {
      status = "on_time";
      minutesLate = 0;
      penaltyAmount = 0;
      message = shift.reason === "roster_off" ? "Đúng giờ (hôm nay xếp nghỉ)" : "Đúng giờ (ngày lễ — không tính phạt)";
    }

    await prisma.attendanceLog.create({
      data: {
        employeeId,
        branchId: employee.branchId,
        date: today,
        session,
        checkInAt: now,
        status,
        minutesLate,
        penaltyAmount,
      },
    });

    // Cập nhật MonthlySummary — daysPresent/daysLate chỉ tăng ở buổi ĐẦU TIÊN trong ngày
    // (ca gãy 2 buổi không được tính thành 2 "ngày làm"), nhưng phút trễ/tiền phạt luôn cộng dồn.
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await prisma.monthlySummary.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      create: {
        employeeId, year, month,
        daysPresent: isFirstLogOfDay ? 1 : 0,
        daysLate: isFirstLogOfDay && minutesLate > 0 ? 1 : 0,
        totalMinutesLate: minutesLate,
        totalPenalty: penaltyAmount,
      },
      update: {
        ...(isFirstLogOfDay && { daysPresent: { increment: 1 } }),
        ...(isFirstLogOfDay && minutesLate > 0 && { daysLate: { increment: 1 } }),
        totalMinutesLate: { increment: minutesLate },
        totalPenalty: { increment: penaltyAmount },
      },
    });

    // Gửi Telegram alert nếu trễ và branch có chatId
    if (status === "late" || status === "very_late") {
      const botToken = employee.company.telegramBotToken;
      const chatId = employee.branch.telegramChatId;
      if (botToken && chatId) {
        void sendTelegram(botToken, chatId, buildLateAlert(employee.name, minutesLate, employee.branch.name, penaltyAmount));
      }
    }

    const prefixIn = sessionCfg ? `[${sessionCfg.label}] ` : "";
    return NextResponse.json({ action: "check_in", status, minutesLate, penaltyAmount, message: prefixIn + message });
  } catch (error) {
    console.error("Face check-in error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
