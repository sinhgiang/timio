import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, type LateRule } from "@/lib/attendance";
import { getTodayString } from "@/lib/utils";
import { sendTelegram, buildLateAlert } from "@/lib/telegram";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { employeeId, pin } = await req.json();

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

    const pinMatch = await bcrypt.compare(pin, employee.pin);
    if (!pinMatch) {
      return NextResponse.json({ error: "PIN không đúng" }, { status: 401 });
    }

    const today = getTodayString();
    const now = new Date();

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
      const scheduled = new Date(now);
      scheduled.setHours(coH, coM, 0, 0);
      const minutesOvertime = now.getTime() > scheduled.getTime() ? Math.floor((now.getTime() - scheduled.getTime()) / 60000) : 0;

      const overtimeRates = employee.company.overtimeRates
        ? (JSON.parse(employee.company.overtimeRates) as { weekday?: number; weekend?: number })
        : { weekday: 1.5, weekend: 2.0 };
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      const multiplier = isWeekend ? (overtimeRates.weekend ?? 2.0) : (overtimeRates.weekday ?? 1.5);
      const dailyRate = (employee.baseSalary ?? 0) / 26;
      const overtimeAmount = minutesOvertime > 0 ? Math.floor((dailyRate / 8) * (minutesOvertime / 60) * multiplier) : 0;

      await prisma.attendanceLog.update({
        where: { id: existingLog.id },
        data: { checkOutAt: now, minutesOvertime, overtimeAmount },
      });

      if (minutesOvertime > 0) {
        await prisma.monthlySummary.upsert({
          where: { employeeId_year_month: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1 } },
          create: { employeeId, year: now.getFullYear(), month: now.getMonth() + 1, totalMinutesOvertime: minutesOvertime, totalOvertimeAmount: overtimeAmount },
          update: { totalMinutesOvertime: { increment: minutesOvertime }, totalOvertimeAmount: { increment: overtimeAmount } },
        });
      }

      return NextResponse.json({
        action: "check_out",
        status: existingLog.status,
        minutesLate: existingLog.minutesLate,
        penaltyAmount: existingLog.penaltyAmount,
        minutesOvertime,
        overtimeAmount,
        message: minutesOvertime > 0 ? `Ra ca · Tăng ca ${minutesOvertime} phút` : "Ra ca thành công",
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
    const shift = {
      checkInTime: shiftOv.checkInTime ?? employee.branch.checkInTime,
      gracePeriod: shiftOv.gracePeriod ?? employee.branch.gracePeriod,
    };

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

    const { status, minutesLate, penaltyAmount, message } =
      calculateCheckInStatus(
        now,
        shift.checkInTime,
        shift.gracePeriod,
        effectiveLateRules
      );

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
