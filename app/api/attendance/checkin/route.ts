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
    const { employeeId, pin, lat, lng, offlineTimestamp } = await req.json();

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: true,
        company: {
          include: { penaltyRules: true },
        },
      },
    });

    if (!employee || employee.status !== "active") {
      return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
    }

    if (!employee.pin || employee.pin !== pin) {
      return NextResponse.json({ error: "PIN không đúng" }, { status: 401 });
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
          error: `Bạn đang ở ngoài phạm vi văn phòng (${Math.round(distance)}m, cho phép ${radius}m). Vui lòng đến văn phòng để chấm công.`,
        }, { status: 403 });
      }
    }

    // Hỗ trợ offline: nếu có offlineTimestamp hợp lệ (trong vòng 24h), dùng nó
    let now = new Date();
    if (offlineTimestamp) {
      const ts = new Date(offlineTimestamp);
      const diffMs = Date.now() - ts.getTime();
      if (diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000) now = ts;
    }
    const today = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

    const existingLog = await prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existingLog) {
      if (existingLog.checkOutAt) {
        return NextResponse.json({ error: "Bạn đã chấm công đủ hôm nay" }, { status: 400 });
      }
      // Check-out — tính tăng ca
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

      // Ra sớm: phạt nếu checkout trước giờ tan ca
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

      // Tăng ca: set pending — chỉ cộng tiền vào lương khi sếp duyệt (giống face check-in)
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
      return NextResponse.json({
        action: "check_out",
        status: existingLog.status,
        minutesLate: existingLog.minutesLate,
        penaltyAmount: totalPenalty,
        minutesEarly,
        earlyLeavePenalty,
        minutesOvertime,
        overtimeAmount,
        message: msgs.length > 0 ? `Ra ca · ${msgs.join(" · ")}` : "Ra ca thành công",
      });
    }

    // Chưa check-in → tính trạng thái (ưu tiên shiftOverride của nhân viên)
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
      const sorted = [...empRules].sort((a, b) => a.minutes - b.minutes);
      effectiveLateRules = sorted.map((r, i) => ({
        fromMinutes: r.minutes,
        toMinutes: sorted[i + 1] ? sorted[i + 1].minutes - 1 : 9999,
        amount: r.amount,
      }));
    } else {
      effectiveLateRules = employee.company.penaltyRules
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
        checkInAt: now,
        status,
        minutesLate,
        penaltyAmount,
      },
    });

    // Cập nhật MonthlySummary
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await prisma.monthlySummary.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      create: {
        employeeId,
        year,
        month,
        daysPresent: 1,
        daysLate: minutesLate > 0 ? 1 : 0,
        totalMinutesLate: minutesLate,
        totalPenalty: penaltyAmount,
      },
      update: {
        daysPresent: { increment: 1 },
        daysLate: { increment: minutesLate > 0 ? 1 : 0 },
        totalMinutesLate: { increment: minutesLate },
        totalPenalty: { increment: penaltyAmount },
      },
    });

    // Gửi Telegram alert nếu trễ
    if (status === "late" || status === "very_late") {
      const botToken = employee.company.telegramBotToken;
      const chatId = employee.branch.telegramChatId;
      if (botToken && chatId) {
        void sendTelegram(botToken, chatId, buildLateAlert(employee.name, minutesLate, employee.branch.name, penaltyAmount));
      }
    }

    return NextResponse.json({ action: "check_in", status, minutesLate, penaltyAmount, message });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
