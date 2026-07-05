import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPin } from "@/lib/mobileEmployeeAuth";

const VN_TZ = "Asia/Ho_Chi_Minh";

function currentVnMonth(): string {
  const d = new Date().toLocaleDateString("sv-SE", { timeZone: VN_TZ }); // YYYY-MM-DD
  return d.slice(0, 7);
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
    const month = searchParams.get("month") || currentVnMonth();

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, status: "active" },
      select: { pin: true },
    });

    if (!employee || !(await checkPin(employee.pin, pin))) {
      return NextResponse.json({ error: "Sai mã PIN" }, { status: 401 });
    }

    const logs = await prisma.attendanceLog.findMany({
      where: { employeeId, date: { startsWith: month } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        checkInAt: true,
        checkOutAt: true,
        status: true,
        minutesLate: true,
        penaltyAmount: true,
      },
    });

    const days = logs.map((l) => ({
      date: l.date,
      checkInTime: l.checkInAt ? fmtTime(l.checkInAt) : null,
      checkOutTime: l.checkOutAt ? fmtTime(l.checkOutAt) : null,
      status: l.status,
      minutesLate: l.minutesLate,
      penaltyAmount: l.penaltyAmount,
    }));

    const present = logs.filter((l) => l.checkInAt).length;
    const late = logs.filter((l) => l.minutesLate > 0).length;
    const absent = logs.filter((l) => l.status === "absent").length;

    return NextResponse.json({
      month,
      days,
      summary: { present, late, absent },
    });
  } catch (err) {
    console.error("[mobile/employee/history]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
