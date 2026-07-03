import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

    const [totalEmployees, logs, pendingLeave] = await Promise.all([
      prisma.employee.count({ where: { companyId: auth.companyId, status: "active" } }),
      prisma.attendanceLog.findMany({
        where: { date: today, employee: { companyId: auth.companyId } },
        select: { status: true, minutesLate: true },
      }),
      prisma.leaveRequest.count({
        where: { companyId: auth.companyId, status: "pending" },
      }),
    ]);

    const present = logs.filter((l) => l.status !== "absent").length;
    const late = logs.filter((l) => l.minutesLate > 0).length;
    const absent = totalEmployees - present;

    return NextResponse.json({
      total: totalEmployees,
      present,
      late,
      absent: Math.max(0, absent),
      pendingLeave,
    });
  } catch (err) {
    console.error("[mobile/manager/stats]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
