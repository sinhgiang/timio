import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slug, code, pin, action, latitude, longitude } = body as {
      slug: string;
      code: string;
      pin: string;
      action: "checkin" | "checkout";
      latitude: number;
      longitude: number;
    };

    if (!slug || !code || !pin || !action || latitude == null || longitude == null) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Find company by slug
    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

    // Find employee
    const employee = await prisma.employee.findFirst({
      where: { companyId: company.id, code: code.toUpperCase(), status: "active" },
      select: {
        id: true, name: true, pin: true,
        branch: {
          select: {
            id: true, name: true,
            lat: true, lng: true, gpsRadius: true,
            checkInTime: true, checkOutTime: true, gracePeriod: true,
          },
        },
      },
    });

    if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    if (!employee.pin || employee.pin !== pin) {
      return NextResponse.json({ error: "PIN không đúng" }, { status: 401 });
    }

    const branch = employee.branch;

    // GPS validation — require branch has coordinates
    if (branch.lat === null || branch.lng === null) {
      return NextResponse.json({
        error: `Chi nhánh "${branch.name}" chưa cấu hình tọa độ GPS. Vui lòng liên hệ admin.`,
      }, { status: 400 });
    }

    const distanceM = haversineMeters(latitude, longitude, branch.lat, branch.lng);
    if (distanceM > branch.gpsRadius) {
      return NextResponse.json({
        error: `Bạn đang ở ngoài vùng chấm công (${Math.round(distanceM)}m, cho phép ${branch.gpsRadius}m). Vui lòng di chuyển đến vị trí làm việc.`,
      }, { status: 403 });
    }

    // Vietnam time
    const now = new Date();
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const todayStr = vnNow.toISOString().slice(0, 10);
    const timeStr = vnNow.toISOString().slice(11, 16); // HH:MM

    if (action === "checkin") {
      // Calculate late minutes
      const [ciH, ciM] = branch.checkInTime.split(":").map(Number);
      const scheduledMinutes = ciH * 60 + ciM;
      const [nowH, nowM] = timeStr.split(":").map(Number);
      const nowMinutes = nowH * 60 + nowM;
      const rawLate = nowMinutes - scheduledMinutes;
      const minutesLate = rawLate > (branch.gracePeriod ?? 5) ? rawLate : 0;
      const statusVal = minutesLate > 30 ? "very_late" : minutesLate > 0 ? "late" : "on_time";

      await prisma.attendanceLog.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: todayStr } },
        update: { checkInAt: now, minutesLate, status: statusVal },
        create: {
          employeeId: employee.id,
          branchId: branch.id,
          date: todayStr,
          checkInAt: now,
          minutesLate,
          status: statusVal,
          note: "GPS remote check-in",
        },
      });

      const statusLabel = statusVal === "on_time" ? "Đúng giờ ✓" : minutesLate > 30 ? `Trễ nhiều (${minutesLate} phút)` : `Đi trễ ${minutesLate} phút`;
      return NextResponse.json({
        name: employee.name,
        status: statusLabel,
        time: `Check-in lúc ${timeStr}`,
      });
    } else {
      // Checkout
      const log = await prisma.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: todayStr } },
      });
      if (!log) {
        return NextResponse.json({ error: "Bạn chưa check-in hôm nay" }, { status: 400 });
      }

      await prisma.attendanceLog.update({
        where: { id: log.id },
        data: { checkOutAt: now },
      });

      return NextResponse.json({
        name: employee.name,
        status: "Đã check-out ✓",
        time: `Check-out lúc ${timeStr}`,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Lỗi hệ thống", detail: msg }, { status: 500 });
  }
}
