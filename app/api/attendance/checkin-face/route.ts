import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus } from "@/lib/attendance";
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

      // Tăng ca: lưu trạng thái "pending" — chỉ tính tiền khi sếp duyệt
      const overtimeStatus = minutesOvertime > 0 ? "pending" : "none";
      await prisma.attendanceLog.update({
        where: { id: existingLog.id },
        data: { checkOutAt: now, minutesOvertime, overtimeAmount, overtimeStatus },
      });
      // Không cập nhật MonthlySummary OT cho đến khi được duyệt

      return NextResponse.json({
        action: "check_out",
        status: existingLog.status,
        minutesLate: existingLog.minutesLate,
        penaltyAmount: existingLog.penaltyAmount,
        minutesOvertime,
        overtimeAmount,
        message: minutesOvertime > 0 ? `Ra ca · Tăng ca ${minutesOvertime} phút — chờ duyệt` : "Ra ca thành công",
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
