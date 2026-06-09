import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus } from "@/lib/attendance";
import { getTodayString } from "@/lib/utils";
import { sendTelegram, buildLateAlert } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const { employeeId } = await req.json();

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

    const today = getTodayString();
    const now = new Date();

    const existingLog = await prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existingLog) {
      if (existingLog.checkOutAt) {
        return NextResponse.json(
          { error: "Bạn đã chấm công đủ hôm nay" },
          { status: 400 }
        );
      }
      // Check-out — tính tăng ca nếu ra muộn hơn giờ tan ca
      let shiftData: { checkOutTime?: string } = {};
      try {
        shiftData = employee.shiftOverride ? JSON.parse(employee.shiftOverride) : {};
      } catch { shiftData = {}; }
      const shift = shiftData;
      const checkOutTime = shift.checkOutTime ?? employee.branch.checkOutTime;
      const [coH, coM] = checkOutTime.split(":").map(Number);
      const scheduled = new Date(now);
      scheduled.setHours(coH, coM, 0, 0);
      const diffMs = now.getTime() - scheduled.getTime();
      const minutesOvertime = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;

      // Tính tiền tăng ca: (lương CB / 26 ngày / 8 giờ) * giờ OT * hệ số
      const overtimeRates = employee.company.overtimeRates
        ? (JSON.parse(employee.company.overtimeRates) as { weekday?: number; weekend?: number })
        : { weekday: 1.5, weekend: 2.0 };
      const dayOfWeek = now.getDay(); // 0=CN, 6=T7
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const multiplier = isWeekend ? (overtimeRates.weekend ?? 2.0) : (overtimeRates.weekday ?? 1.5);
      const dailyRate = (employee.baseSalary ?? 0) / 26;
      const hourlyRate = dailyRate / 8;
      const overtimeAmount = minutesOvertime > 0 ? Math.floor(hourlyRate * (minutesOvertime / 60) * multiplier) : 0;

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

    // Check-in — use per-employee shift override if set, otherwise use branch defaults
    let shiftOverrideParsed: { checkInTime?: string; gracePeriod?: number } = {};
    try {
      shiftOverrideParsed = employee.shiftOverride ? JSON.parse(employee.shiftOverride) : {};
    } catch { shiftOverrideParsed = {}; }
    const shift = {
      checkInTime: shiftOverrideParsed.checkInTime ?? employee.branch.checkInTime,
      gracePeriod: shiftOverrideParsed.gracePeriod ?? employee.branch.gracePeriod,
    };

    const { status, minutesLate, penaltyAmount, message } =
      calculateCheckInStatus(
        now,
        shift.checkInTime,
        shift.gracePeriod,
        employee.company.penaltyRules
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
        employeeId, year, month,
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

    // Gửi Telegram alert nếu trễ và branch có chatId
    if (status === "late" || status === "very_late") {
      const botToken = employee.company.telegramBotToken;
      const chatId = employee.branch.telegramChatId;
      if (botToken && chatId) {
        void sendTelegram(botToken, chatId, buildLateAlert(employee.name, minutesLate, employee.branch.name, penaltyAmount));
      }
    }

    return NextResponse.json({ action: "check_in", status, minutesLate, penaltyAmount, message });
  } catch (error) {
    console.error("Face check-in error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
