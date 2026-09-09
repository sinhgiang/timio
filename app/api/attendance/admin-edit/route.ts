import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCheckInStatus, calculateEarlyLeave, filterApplicableRules } from "@/lib/attendance";
import { managerBranchId } from "@/lib/branchScope";
import { parseShiftSessions, findDayOverride, dateStringToVNInstant } from "@/lib/shiftResolve";
import { getApprovedTimeOverride, pickApprovedTime } from "@/lib/approvedException";

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
    // Bắt buộc phải ghi lý do khi admin sửa tay chấm công (VD: máy lỗi do chặn ngày lễ, chấm bù lại)
    // — để cả nhân viên (app /ho-so) và chủ (báo cáo tháng) đều biết vì sao có thay đổi, thay vì chỉ
    // thấy giờ bị đổi mà không rõ nguyên nhân. Chặn ở server (không chỉ ở form) vì đây mới là chỗ
    // enforce thật — ReportsClient.tsx + CorrectionsClient.tsx đều gọi chung route này.
    const noteTrimmed = typeof note === "string" ? note.trim() : "";
    if (!noteTrimmed) {
      return NextResponse.json({ error: "Vui lòng nhập lý do sửa chấm công (bắt buộc)" }, { status: 400 });
    }
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

    // Đơn "xin về sớm/đến muộn" đã được sếp DUYỆT TRƯỚC cho đúng ngày này (nếu có) — ưu tiên CAO
    // NHẤT khi tính giờ chuẩn, để khớp với hành vi tự động ở checkin-face/checkin/checkin-qr (xem
    // lib/approvedException.ts). Kể cả khi admin tự sửa tay, giờ đã xin phép vẫn không bị phạt.
    const approvedOverride = await getApprovedTimeOverride(employeeId, date);

    const shiftData = employee.shiftOverride
      ? (JSON.parse(employee.shiftOverride) as { checkInTime?: string; checkOutTime?: string; gracePeriod?: number })
      : {};
    // Ca gãy nhiều buổi/ngày — dùng giờ riêng của buổi đang sửa (session != "full").
    const sessions = parseShiftSessions(employee.shiftOverride);
    const sessionCfg = sessions && sessionKey !== "full" ? sessions[Number(sessionKey)] ?? null : null;
    // Ngày làm khác — chỉ áp dụng cho dòng "full" (không tách buổi), khớp checkin-face/route.ts.
    const dayOverride = sessionKey === "full"
      ? findDayOverride(employee.shiftOverride, checkInDate ?? checkOutDate ?? dateStringToVNInstant(date))
      : null;

    // Tính trạng thái check-in
    let status = "absent";
    let minutesLate = 0;
    let latePenalty = 0;
    let pickedLateArrival: string | null = null;

    if (checkInDate) {
      const fallbackCheckInTime = sessionCfg?.checkInTime ?? dayOverride?.checkInTime ?? shiftData.checkInTime ?? employee.branch.checkInTime;
      // Ca gãy có thể có >1 đơn "xin đến muộn" đã duyệt trong ngày (1 đơn/buổi) — chọn đúng đơn
      // ứng với buổi đang sửa (gần giờ chuẩn buổi này nhất), xem lib/approvedException.ts.
      pickedLateArrival = pickApprovedTime(approvedOverride.lateArrivalRows, fallbackCheckInTime);
      const checkInTime = pickedLateArrival ?? fallbackCheckInTime;
      const gracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const lateRules = filterApplicableRules(employee.company.penaltyRules, employee, checkInDate)
        .filter((r) => r.type !== "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));

      const result = calculateCheckInStatus(checkInDate, checkInTime, gracePeriod, lateRules);
      status = result.status;
      minutesLate = result.minutesLate;
      latePenalty = result.penaltyAmount;
    }

    // Tính phạt "ra sớm" nếu admin cũng sửa/nhập giờ ra — dùng chung lib/attendance.ts
    // calculateEarlyLeave với checkin-face/checkin/checkin-qr/recalculate. TRƯỚC ĐÂY route này bỏ
    // qua hoàn toàn phần này: sửa tay giờ vào/ra sẽ ghi đè penaltyAmount chỉ bằng phần phạt trễ,
    // XÓA MẤT phạt ra sớm đã tính lúc chấm công thật (đây là nguồn gốc lỗi báo cáo "Đúng giờ" vẫn
    // bị trừ tiền mà không rõ lý do — xem ReportsClient.tsx).
    let minutesEarly = 0;
    let earlyLeavePenalty = 0;
    let pickedEarlyLeave: string | null = null;
    if (checkOutDate) {
      const fallbackCheckOutTime = sessionCfg?.checkOutTime ?? dayOverride?.checkOutTime ?? shiftData.checkOutTime ?? employee.branch.checkOutTime;
      // Ca gãy có thể có >1 đơn "xin về sớm" đã duyệt trong ngày (1 đơn/buổi) — chọn đúng đơn ứng
      // với buổi đang sửa (gần giờ chuẩn buổi này nhất), xem lib/approvedException.ts.
      pickedEarlyLeave = pickApprovedTime(approvedOverride.earlyLeaveRows, fallbackCheckOutTime);
      const checkOutTime = pickedEarlyLeave ?? fallbackCheckOutTime;
      const coGracePeriod = sessionCfg?.gracePeriod ?? dayOverride?.gracePeriod ?? shiftData.gracePeriod ?? employee.branch.gracePeriod;
      const earlyRules = filterApplicableRules(employee.company.penaltyRules, employee, checkOutDate)
        .filter((r) => r.type === "early_leave")
        .map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount }));
      ({ minutesEarly, earlyLeavePenalty } = calculateEarlyLeave(checkOutDate, checkOutTime, coGracePeriod, earlyRules));
    }

    const penaltyAmount = latePenalty + earlyLeavePenalty;

    // Upsert AttendanceLog trực tiếp — mặc định 1 dòng/ngày (session "full"); với NV ca gãy
    // nhiều buổi/ngày, client (ReportsClient DayTable) gửi kèm `session` ("0","1",...) để sửa
    // đúng buổi đang chọn, xem lib/shiftResolve.ts.
    const existing = await prisma.attendanceLog.findUnique({
      where: { employeeId_date_session: { employeeId, date, session: sessionKey } },
    });

    // Lưu giờ GỐC (trước khi admin sửa) để hiện badge "i" trên báo cáo — chỉ chụp lại
    // ở LẦN SỬA ĐẦU TIÊN (existing.originalCheckInAt ?? existing.checkInAt), các lần sửa
    // sau giữ nguyên giá trị gốc thật, không bị ghi đè thành giờ đã sửa trước đó.
    // Dòng tạo mới hoàn toàn (existing null, NV không hề chấm công) → không có giờ gốc, để null.
    const originalCheckInAt = existing ? existing.originalCheckInAt ?? existing.checkInAt : null;
    const originalCheckOutAt = existing ? existing.originalCheckOutAt ?? existing.checkOutAt : null;

    if (existing) {
      await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: {
          checkInAt: checkInDate,
          checkOutAt: checkOutDate,
          originalCheckInAt,
          originalCheckOutAt,
          status,
          minutesLate,
          minutesEarly,
          earlyLeavePenalty,
          penaltyAmount,
          note: noteTrimmed,
          lateArrivalApproved: checkInDate ? !!pickedLateArrival : false,
          earlyLeaveApproved: checkOutDate ? !!pickedEarlyLeave : false,
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
          originalCheckInAt,
          originalCheckOutAt,
          status,
          minutesLate,
          minutesEarly,
          earlyLeavePenalty,
          penaltyAmount,
          note: noteTrimmed,
          lateArrivalApproved: checkInDate ? !!pickedLateArrival : false,
          earlyLeaveApproved: checkOutDate ? !!pickedEarlyLeave : false,
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

    return NextResponse.json({ ok: true, status, minutesLate, minutesEarly, earlyLeavePenalty, penaltyAmount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
