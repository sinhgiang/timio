import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, type LateRule } from "@/lib/attendance";
import { resolveShift } from "@/lib/shiftResolve";
import { getTodayString } from "@/lib/utils";
import { sendTelegram, buildLateAlert } from "@/lib/telegram";

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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
    const { qrToken, lat, lng } = await req.json();

    if (!qrToken) {
      return NextResponse.json({ error: "Thiếu mã QR" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { qrToken },
      include: {
        branch: true,
        company: { include: { penaltyRules: true } },
      },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Mã QR không hợp lệ hoặc nhân viên không hoạt động" }, { status: 404 });
    }

    // Kiểm tra IP whitelist nếu chi nhánh đã cấu hình
    if (employee.branch.allowedIPs) {
      try {
        const allowed = JSON.parse(employee.branch.allowedIPs) as string[];
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

    // Kiểm tra GPS nếu chi nhánh đã cấu hình
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
          error: `Bạn đang ở ngoài phạm vi văn phòng (${Math.round(distance)}m, cho phép ${radius}m).`,
        }, { status: 403 });
      }
    }

    const today = getTodayString();
    const now = new Date();
    const employeeId = employee.id;

    const existingLog = await prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existingLog) {
      if (existingLog.checkOutAt) {
        return NextResponse.json({ error: "Bạn đã chấm công đủ hôm nay" }, { status: 400 });
      }
      // Check-out
      const shiftOut = employee.shiftOverride
        ? (JSON.parse(employee.shiftOverride) as { checkOutTime?: string })
        : {};
      const checkOutTime = shiftOut.checkOutTime ?? employee.branch.checkOutTime;
      const [coH, coM] = checkOutTime.split(":").map(Number);
      const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
      const nowVNMinutes = Math.floor(((now.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
      const coScheduledMinutes = coH * 60 + coM;
      let coMinutesDiff = nowVNMinutes - coScheduledMinutes;
      if (coMinutesDiff < -720) coMinutesDiff += 1440;
      const minutesOvertime = coMinutesDiff > 0 ? coMinutesDiff : 0;

      const overtimeRates = employee.company.overtimeRates
        ? (JSON.parse(employee.company.overtimeRates) as { weekday?: number; weekend?: number })
        : { weekday: 1.5, weekend: 2.0 };
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      const multiplier = isWeekend ? (overtimeRates.weekend ?? 2.0) : (overtimeRates.weekday ?? 1.5);
      const dailyRate = (employee.baseSalary ?? 0) / 26;
      const overtimeAmount = minutesOvertime > 0 ? Math.floor((dailyRate / 8) * (minutesOvertime / 60) * multiplier) : 0;

      const minutesEarly = nowVNMinutes < coScheduledMinutes ? coScheduledMinutes - nowVNMinutes : 0;
      let earlyLeavePenalty = 0;
      if (minutesEarly > (employee.branch.gracePeriod ?? 5)) {
        const earlyRules = employee.company.penaltyRules
          .filter((r) => r.type === "early_leave")
          .sort((a, b) => a.fromMinutes - b.fromMinutes);
        for (const rule of earlyRules) {
          if (minutesEarly >= rule.fromMinutes && minutesEarly <= rule.toMinutes) { earlyLeavePenalty = rule.amount; break; }
          if (minutesEarly > rule.toMinutes) earlyLeavePenalty = rule.amount;
        }
      }

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

      const msgs: string[] = [];
      if (minutesEarly > 0 && earlyLeavePenalty > 0) msgs.push(`Ra sớm ${minutesEarly} phút`);
      if (minutesOvertime > 0) msgs.push(`Tăng ca ${minutesOvertime} phút — chờ duyệt`);
      return NextResponse.json({
        action: "check_out",
        status: existingLog.status,
        minutesLate: existingLog.minutesLate,
        penaltyAmount: existingLog.penaltyAmount + earlyLeavePenalty,
        message: msgs.length > 0 ? `Ra ca · ${msgs.join(" · ")}` : "Ra ca thành công",
        employeeName: employee.name,
      });
    }

    // Check-in mới
    const shiftOv = employee.shiftOverride
      ? (JSON.parse(employee.shiftOverride) as {
          checkInTime?: string;
          gracePeriod?: number;
          useDefaultLate?: boolean;
          lateRules?: Array<{ minutes: number; amount: number }>;
        })
      : {};
    // Ca theo ngày (Lịch phân ca) + ngày lễ → xác định giờ vào chuẩn + có né phạt không
    const [todaysAssignments, todayHoliday] = await Promise.all([
      prisma.shiftAssignment.findMany({ where: { employeeId, date: today }, select: { shiftLabel: true, checkIn: true } }),
      prisma.holiday.findFirst({ where: { companyId: employee.companyId, date: today }, select: { penalizeLate: true } }),
    ]);
    const shift = resolveShift({
      now,
      branchCheckInTime: employee.branch.checkInTime,
      branchGracePeriod: employee.branch.gracePeriod,
      shiftOverrideRaw: employee.shiftOverride,
      todaysAssignments,
      holiday: todayHoliday,
    });

    let effectiveLateRules: LateRule[];
    if (shiftOv.useDefaultLate === false) {
      const empRules = shiftOv.lateRules ?? [];
      effectiveLateRules = empRules.sort((a, b) => a.minutes - b.minutes).map((r) => ({
        fromMinutes: r.minutes,
        toMinutes: r.minutes + 29,
        amount: r.amount,
        type: "late" as const,
      }));
    } else {
      effectiveLateRules = employee.company.penaltyRules
        .filter((r) => r.type === "late")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount, type: "late" as const }));
    }

    let { status, minutesLate, penaltyAmount } = calculateCheckInStatus(
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
    }

    const log = await prisma.attendanceLog.create({
      data: { employeeId, date: today, checkInAt: now, status, minutesLate, penaltyAmount, branchId: employee.branchId },
    });

    if (penaltyAmount > 0) {
      await prisma.monthlySummary.upsert({
        where: { employeeId_year_month: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1 } },
        create: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1, totalPenalty: penaltyAmount },
        update: { totalPenalty: { increment: penaltyAmount } },
      });
    }

    if ((status === "late" || status === "very_late") && employee.branch.telegramChatId) {
      const botToken = employee.company.telegramBotToken;
      if (botToken) {
        const msg = buildLateAlert(employee.name, minutesLate, employee.branch.name, penaltyAmount);
        sendTelegram(botToken, employee.branch.telegramChatId, msg).catch(() => {});
      }
    }

    return NextResponse.json({
      action: "check_in",
      status,
      minutesLate,
      penaltyAmount,
      message: log.id,
      employeeName: employee.name,
    });
  } catch (e) {
    return NextResponse.json({ error: `Lỗi: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
