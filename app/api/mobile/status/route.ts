import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VN_TZ = "Asia/Ho_Chi_Minh";

function getDateString(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: VN_TZ });
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: VN_TZ,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const pin = searchParams.get("pin");

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { pin: true, name: true, status: true },
    });

    if (!employee || employee.status !== "active" || employee.pin !== pin) {
      return NextResponse.json({ error: "Không được phép" }, { status: 401 });
    }

    const today = getDateString(new Date());
    const log = await prisma.attendanceLog.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      select: { checkInAt: true, checkOutAt: true, status: true, minutesLate: true },
    });

    return NextResponse.json({
      date: today,
      checkInAt: log?.checkInAt ?? null,
      checkOutAt: log?.checkOutAt ?? null,
      checkInTime: log?.checkInAt ? fmtTime(log.checkInAt) : null,
      checkOutTime: log?.checkOutAt ? fmtTime(log.checkOutAt) : null,
      status: log?.status ?? null,
      minutesLate: log?.minutesLate ?? 0,
    });
  } catch (err) {
    console.error("[mobile/status]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
