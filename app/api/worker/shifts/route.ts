import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { buildMonthSchedule } from "@/lib/monthSchedule";
import { dateRange } from "@/lib/holidayAttendance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  maternity: "Nghỉ thai sản",
  other: "Nghỉ phép",
};

// Lịch làm việc CẢ THÁNG — mọi ngày trong tháng, đi làm hay nghỉ + giờ dự kiến (không chỉ những
// ngày có Lịch phân ca như trước). Chọn 1 công ty/lần xem (?companyId=, mặc định công ty đầu
// tiên) — khớp cách PayslipTab xử lý NV làm nhiều công ty, tránh gộp lịch nhiều nơi lẫn lộn trong
// 1 lưới tháng. Logic gộp ưu tiên nằm ở lib/monthSchedule.ts (buildMonthSchedule).
export async function GET(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const year = Number(searchParams.get("year")) || nowVN.getUTCFullYear();
  const month = Number(searchParams.get("month")) || nowVN.getUTCMonth() + 1;
  const reqCompanyId = searchParams.get("companyId") || "";

  const emps = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: {
      id: true, companyId: true, shiftOverride: true,
      company: { select: { name: true } },
      branch: { select: { workDays: true, checkInTime: true, checkOutTime: true } },
    },
  });
  if (emps.length === 0) return NextResponse.json({ companies: [], companyId: "", year, month, days: [] });

  const companies = emps.map((e) => ({ companyId: e.companyId, companyName: e.company?.name ?? "" }));
  const employee = emps.find((e) => e.companyId === reqCompanyId) ?? emps[0];

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const [assignments, fixedHolidays, leaves] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { employeeId: employee.id, date: { gte: monthStart, lte: monthEnd } },
      select: { date: true, shiftLabel: true, checkIn: true, checkOut: true },
    }),
    // Chỉ lấy ngày lễ "cố định" (mode=fixed, áp cả công ty) — ngày lễ "tự chọn" (mode=flexible)
    // không có khoảng ngày cố định để hiện ở đây, NV chọn ngày nào thì ngày đó đã thành 1
    // LeaveRequest (type="holiday") riêng của NV, lấy ở dưới.
    prisma.holiday.findMany({
      where: { companyId: employee.companyId, mode: "fixed" },
      select: { date: true, endDate: true, name: true },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: employee.id, status: "approved", fromDate: { lte: monthEnd }, toDate: { gte: monthStart } },
      select: { type: true, fromDate: true, toDate: true, dates: true, holiday: { select: { name: true } } },
    }),
  ]);

  const assignmentsByDate = new Map<string, { shiftLabel: string; checkIn: string; checkOut: string }[]>();
  for (const a of assignments) {
    const arr = assignmentsByDate.get(a.date) ?? [];
    arr.push({ shiftLabel: a.shiftLabel, checkIn: a.checkIn, checkOut: a.checkOut });
    assignmentsByDate.set(a.date, arr);
  }

  const fixedHolidaysByDate = new Map<string, string>();
  for (const h of fixedHolidays) {
    const end = h.endDate ?? h.date;
    if (end < monthStart || h.date > monthEnd) continue;
    for (const d of dateRange(h.date, end)) {
      if (d >= monthStart && d <= monthEnd) fixedHolidaysByDate.set(d, h.name);
    }
  }

  const leaveByDate = new Map<string, string>();
  for (const lr of leaves) {
    if (lr.type === "holiday" && lr.dates) {
      let dates: string[] = [];
      try { dates = JSON.parse(lr.dates); } catch { dates = []; }
      const label = `Nghỉ lễ${lr.holiday?.name ? `: ${lr.holiday.name}` : ""}`;
      for (const d of dates) if (d >= monthStart && d <= monthEnd) leaveByDate.set(d, label);
    } else {
      const label = LEAVE_TYPE_LABELS[lr.type] ?? "Nghỉ phép";
      for (const d of dateRange(lr.fromDate, lr.toDate)) {
        if (d >= monthStart && d <= monthEnd) leaveByDate.set(d, label);
      }
    }
  }

  const days = buildMonthSchedule({
    year, month,
    branch: employee.branch,
    shiftOverrideRaw: employee.shiftOverride,
    assignmentsByDate, fixedHolidaysByDate, leaveByDate,
  });

  return NextResponse.json({ companies, companyId: employee.companyId, year, month, days });
}
