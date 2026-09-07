import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, filterApplicableRules } from "@/lib/attendance";
import { managerBranchId } from "@/lib/branchScope";
import { parseShiftSessions, findDayOverride, dateStringToVNInstant } from "@/lib/shiftResolve";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = (session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined);
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["owner", "manager", "accountant"].includes(user.role ?? "")) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const { employeeId, date, checkInAt, checkOutAt, note, session: sessionRaw } = await req.json();
    if (!employeeId || !date) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    // "full" (ca thường/ngày làm khác, mặc định — giữ nguyên hành vi cũ cho NV không ca gãy) hoặc
    // "0","1",... (chỉ số buổi — NV ca gãy nhiều buổi/ngày, xem Employee.shiftOverride.sessions).
    // Đặt tên `sessionKey` để tránh trùng với biến `session` của NextAuth (getServerSession) ở trên.
    const sessionKey: string = typeof sessionRaw === "string" && sessionRaw ? sessionRaw : "full";

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: user.companyId },
      include: { branch: true, company: { include: { penaltyRules: true } } },
    });
    if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    const mgrBranch = managerBranchId(user);
    if (mgrBranch && employee.branchId !== mgrBranch) {
      return NextResponse.json({ error: "Bạn chỉ được sửa chấm công nhân viên chi nhánh mình." }, { status: 403 });
    }

    const checkInDate = checkInAt ? new Date(checkInAt) : null;
    const checkOutDate = checkOutAt ? new Date(checkOutAt) : null;

    // Tính trạng thái check-in
    let status = "absent";
    let minutesLate = 0;
    let penaltyAmount = 0;

    if (checkInDate) {
      const shiftData = employee.shiftOverride ? JSON.parse(employee.shiftOverride) as { checkInTime?: string; gracePeriod?: number } : {};
      // Ca gãy nhiều buổi/ngày — dùng giờ riêng của buổi đang sửa (session != "full").
      const sessions = parseShiftSessions(employee.shiftOverride);
      const sessionCfg = sessions && sessionKey !== "full" ? sessions[Number(sessionKey)] ?? null : null;
      // Ngày làm khác — chỉ áp dụng cho dòng "full" (không tách buổi), khớp checkin-face/route.ts.
      const dayOverride = sessionKey === "full"
        ? findDayOverride(employee.shiftOverride, checkInDate ?? dateStringToVNInstant(date))
        : null;
      const checkInTime = sessionCfg?.checkInTime ?? dayOverride?.checkInTime ?? shiftData.checkInTime ?? employee.branch.checkInTime;
      const gracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const lateRules = filterApplicableRules(employee.company.penaltyRules, employee, checkInDate)
        .filter((r) => r.type !== "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));

      const result = calculateCheckInStatus(checkInDate, checkInTime, gracePeriod, lateRules);
      status = result.status;
      minutesLate = result.minutesLate;
      penaltyAmount = result.penaltyAmount;
    }

    // Upsert AttendanceLog trực tiếp — mặc định 1 dòng/ngày (session "full"); với NV ca gãy
    // nhiều buổi/ngày, client (ReportsClient DayTable) gửi kèm `session` ("0","1",...) để sửa
    // đúng buổi đang chọn, xem lib/shiftResolve.ts.
    const existing = await prisma.attendanceLog.findUnique({
      where: { employeeId_date_session: { employeeId, date, session: sessionKey } },
    });

    if (existing) {
      await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkInAt: checkInDate,
          checkOutAt: checkOutDate,
          status,
          minutesLate,
          penaltyAmount,
          note: note || null,
        },
      });
    } else {
      await prisma.attendanceLog.create({
        data: {
          employeeId,
          branchId: employee.branchId,
          date,
          session: sessionKey,
          checkInAt: checkInDate,
          checkOutAt: checkOutDate,
          status,
          minutesLate,
          penaltyAmount,
          note: note || null,
        },
      });
    }

    // Recompute MonthlySummary — daysPresent/daysLate chỉ tính 1 lần/ngày (ca gãy nhiều buổi
    // không được tính thành nhiều "ngày làm"), nhưng phút trễ/tiền phạt luôn cộng dồn tất cả buổi.
    // (khớp logic isFirstLogOfDay trong checkin-face/route.ts)
    const [y, m] = date.split("-").map(Number);
    const monthLogs = await prisma.attendanceLog.findMany({
      where: { employeeId, date: { startsWith: `${y}-${String(m).padStart(2, "0")}` } },
    });
    const byDate = new Map<string, typeof monthLogs>();
    for (const l of monthLogs) {
      const arr = byDate.get(l.date) ?? [];
      arr.push(l);
      byDate.set(l.date, arr);
    }
    let daysPresent = 0, daysLate = 0, totalMinutesLate = 0, totalPenalty = 0;
    for (const dayLogs of Array.from(byDate.values())) {
      if (dayLogs.some((l) => l.status !== "absent" && l.checkInAt)) daysPresent++;
      if (dayLogs.some((l) => l.minutesLate > 0)) daysLate++;
      totalMinutesLate += dayLogs.reduce((s, l) => s + l.minutesLate, 0);
      totalPenalty += dayLogs.reduce((s, l) => s + l.penaltyAmount, 0);
    }

    await prisma.monthlySummary.upsert({
      where: { employeeId_year_month: { employeeId, year: y, month: m } },
      create: { employeeId, year: y, month: m, daysPresent, daysLate, totalMinutesLate, totalPenalty },
      update: { daysPresent, daysLate, totalMinutesLate, totalPenalty },
    });

    return NextResponse.json({ ok: true, status, minutesLate, penaltyAmount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
