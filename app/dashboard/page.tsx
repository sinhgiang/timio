import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayString, formatTime, formatCurrency } from "@/lib/utils";
import { getStatusColor, getStatusLabel } from "@/lib/attendance";
import {
  Users, CheckCircle2, AlertTriangle, UserX, Monitor,
  ClipboardList, CalendarOff, FileWarning, TrendingDown,
  ClipboardEdit, ArrowRight, BarChart3, UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import OnboardingBanner from "@/components/dashboard/OnboardingBanner";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const scopedBranchId = u?.role === "manager" && u?.branchId ? u.branchId : null;
  const empFilter = { companyId, status: "active", ...(scopedBranchId ? { branchId: scopedBranchId } : {}) };
  const empWhereNested = { companyId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) };

  const today = getTodayString();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [
    allEmployees,
    totalEmployees,
    todayLogs,
    company,
    onLeaveToday,
    weekLogs,
    expiringContracts,
    thisMonthLateLogs,
    pendingLeaveCount,
    pendingCorrectionCount,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: empFilter,
      select: { id: true, name: true, code: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.count({ where: empFilter }),
    prisma.attendanceLog.findMany({
      where: { employee: empWhereNested, date: today },
      include: { employee: { include: { branch: true } } },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      include: { branches: { take: 1 } },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: "approved",
        fromDate: { lte: today },
        toDate: { gte: today },
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      include: { employee: { select: { name: true, department: true, code: true } } },
    }),
    prisma.attendanceLog.findMany({
      where: { employee: empWhereNested, date: { gte: sevenDaysAgoStr, lte: today } },
      select: { date: true, status: true },
    }),
    prisma.contract.findMany({
      where: {
        endDate: { not: null, gte: today, lte: in30DaysStr },
        employee: { ...empWhereNested, status: "active" },
      },
      select: {
        id: true, endDate: true, type: true,
        employee: { select: { name: true, code: true, department: true } },
      },
      orderBy: { endDate: "asc" },
      take: 5,
    }).catch(() => []),
    prisma.attendanceLog.findMany({
      where: { employee: empWhereNested, date: { gte: monthStart, lte: today }, minutesLate: { gt: 0 } },
      select: { employeeId: true, minutesLate: true, employee: { select: { name: true, department: true } } },
    }).catch(() => []),
    prisma.leaveRequest.count({ where: { companyId, status: "pending" } }).catch(() => 0),
    prisma.correctionRequest.count({ where: { status: "pending", employee: { companyId } } }).catch(() => 0),
  ]);

  // 7-day chart
  const chartDays: { label: string; onTime: number; late: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = weekLogs.filter((l) => l.date === dateStr);
    chartDays.push({
      label: d.toLocaleDateString("vi-VN", { weekday: "short", timeZone: "Asia/Ho_Chi_Minh" }),
      onTime: dayLogs.filter((l) => l.status === "on_time").length,
      late: dayLogs.filter((l) => l.status === "late" || l.status === "very_late").length,
    });
  }

  // Top late employees
  const lateByEmployee = new Map<string, { name: string; department: string | null; totalMinutes: number; occurrences: number }>();
  for (const l of thisMonthLateLogs) {
    const entry = lateByEmployee.get(l.employeeId) ?? { name: l.employee.name, department: l.employee.department, totalMinutes: 0, occurrences: 0 };
    entry.totalMinutes += l.minutesLate;
    entry.occurrences += 1;
    lateByEmployee.set(l.employeeId, entry);
  }
  const topLateEmployees = Array.from(lateByEmployee.values()).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 5);

  const onTime = todayLogs.filter((l) => l.status === "on_time").length;
  const late = todayLogs.filter((l) => l.status === "late" || l.status === "very_late").length;
  const checkedIn = todayLogs.length;
  const notCheckedIn = totalEmployees - checkedIn;
  const checkInRate = totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0;

  const checkedInIds = new Set(todayLogs.map((l) => l.employee.id));
  const notCheckedInEmployees = allEmployees.filter((e) => !checkedInIds.has(e.id));

  const todayDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  });

  const checkInUrl = company?.slug ? `/checkin/${company.slug}` : null;
  const isNewCompany = totalEmployees === 0;

  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const calcMinutesEarly = (log: typeof todayLogs[0]): number => {
    if (!log.checkOutAt) return 0;
    let checkOutTime = log.employee.branch.checkOutTime;
    try {
      const ov = log.employee.shiftOverride ? JSON.parse(log.employee.shiftOverride) : {};
      if (ov.checkOutTime) checkOutTime = ov.checkOutTime;
    } catch { /* ignore */ }
    const [coH, coM] = checkOutTime.split(":").map(Number);
    const scheduledMinutes = coH * 60 + coM;
    const actualMinutes = Math.floor(((log.checkOutAt.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
    const diff = scheduledMinutes - actualMinutes;
    return diff > (log.employee.branch.gracePeriod ?? 5) ? diff : 0;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tổng quan hôm nay</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{todayDate}</p>
        </div>
        {checkInUrl && (
          <a href={checkInUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Monitor size={15} />
            Mở màn hình chấm công
          </a>
        )}
      </div>

      {isNewCompany && <OnboardingBanner checkInUrl={checkInUrl} />}

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Tổng NV" value={totalEmployees} sub={`${checkInRate}% đã vào`} Icon={Users} color="blue" />
        <StatCard label="Đúng giờ" value={onTime} sub={totalEmployees > 0 ? `${Math.round(onTime / totalEmployees * 100)}% tổng NV` : "—"} Icon={CheckCircle2} color="green" />
        <StatCard label="Đi trễ" value={late} sub={late > 0 ? "cần chú ý" : "Tốt hôm nay"} Icon={AlertTriangle} color={late > 0 ? "yellow" : "green"} />
        <StatCard label="Chưa vào" value={notCheckedIn} sub={notCheckedIn > 0 ? "chưa chấm công" : "Đã đủ mặt"} Icon={UserX} color={notCheckedIn > 0 ? "gray" : "green"} />
        <StatCard label="Nghỉ phép" value={onLeaveToday.length} sub="đã duyệt hôm nay" Icon={CalendarOff} color="purple" />
      </div>

      {/* ── QUICK ACTIONS ── */}
      {!isNewCompany && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Link href="/dashboard/leave" className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-orange-300 hover:bg-orange-50/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 group-hover:bg-orange-200 transition-colors">
              <CalendarOff size={16} className="text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-700 truncate">Nghỉ phép chờ duyệt</div>
              {pendingLeaveCount > 0
                ? <div className="text-xs text-orange-600 font-bold">{pendingLeaveCount} đơn đang chờ</div>
                : <div className="text-xs text-gray-400">Không có đơn mới</div>}
            </div>
          </Link>
          <Link href="/dashboard/corrections" className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
              <ClipboardEdit size={16} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-700 truncate">Điều chỉnh chấm công</div>
              {pendingCorrectionCount > 0
                ? <div className="text-xs text-blue-600 font-bold">{pendingCorrectionCount} yêu cầu chờ</div>
                : <div className="text-xs text-gray-400">Không có yêu cầu mới</div>}
            </div>
          </Link>
          <Link href="/dashboard/reports" className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-green-300 hover:bg-green-50/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
              <BarChart3 size={16} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-700">Báo cáo tháng</div>
              <div className="text-xs text-gray-400">Xem & xuất Excel</div>
            </div>
          </Link>
          <Link href="/dashboard/employees" className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-purple-300 hover:bg-purple-50/40 transition-all group">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
              <UserPlus size={16} className="text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-700">Nhân viên</div>
              <div className="text-xs text-gray-400">{totalEmployees} đang hoạt động</div>
            </div>
          </Link>
        </div>
      )}

      {/* ── MAIN CONTENT — 2 cols ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* LEFT: Attendance */}
        <div className="lg:col-span-2 space-y-4">

          {/* Chấm công hôm nay */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Chấm công hôm nay</h2>
                <p className="text-xs text-gray-400 mt-0.5">{checkedIn}/{totalEmployees} nhân viên đã vào</p>
              </div>
              {totalEmployees > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${checkInRate === 100 ? "bg-emerald-400" : checkInRate > 50 ? "bg-blue-400" : "bg-amber-400"}`}
                      style={{ width: `${checkInRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-500">{checkInRate}%</span>
                </div>
              )}
            </div>

            {todayLogs.length === 0 ? (
              notCheckedInEmployees.length > 0 ? (
                <div className="p-5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Chưa có mặt hôm nay</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {notCheckedInEmployees.slice(0, 10).map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{emp.name}</p>
                          {emp.department && <p className="text-xs text-gray-400 truncate">{emp.department}</p>}
                        </div>
                        <div className="ml-auto w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                      </div>
                    ))}
                    {notCheckedInEmployees.length > 10 && (
                      <p className="col-span-2 text-xs text-gray-400 text-center pt-1">+{notCheckedInEmployees.length - 10} người nữa</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-14 text-gray-400">
                  <ClipboardList size={40} strokeWidth={1.2} className="mb-3 text-gray-200" />
                  <p className="text-sm">{isNewCompany ? "Thêm nhân viên để bắt đầu chấm công" : "Chưa có nhân viên nào chấm công hôm nay"}</p>
                  {isNewCompany && (
                    <Link href="/dashboard/employees" className="mt-3 text-sm text-blue-600 font-medium hover:underline">
                      Thêm nhân viên đầu tiên →
                    </Link>
                  )}
                </div>
              )
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nhân viên</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vào</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ra</th>
                        <th className="text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trễ / Sớm</th>
                        <th className="text-right px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {todayLogs.map((log) => {
                        const mEarly = calcMinutesEarly(log);
                        return (
                          <tr key={log.id} className="hover:bg-gray-50/60">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                                  {log.employee.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800">{log.employee.name}</div>
                                  {log.employee.department && <div className="text-xs text-gray-400">{log.employee.department}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700">{formatTime(log.checkInAt)}</td>
                            <td className="px-4 py-3 font-mono text-gray-400">{log.checkOutAt ? formatTime(log.checkOutAt) : <span className="text-gray-200">—</span>}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                {getStatusLabel(log.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs">
                              {log.minutesLate > 0
                                ? <span className="text-amber-600 font-bold">+{log.minutesLate}p trễ</span>
                                : mEarly > 0
                                  ? <span className="text-orange-500 font-bold">−{mEarly}p sớm</span>
                                  : <span className="text-gray-200">—</span>}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {log.penaltyAmount > 0
                                ? <span className="text-red-600 font-semibold text-xs">−{formatCurrency(log.penaltyAmount)}</span>
                                : <span className="text-gray-200">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-50">
                  {todayLogs.map((log) => {
                    const mEarly = calcMinutesEarly(log);
                    return (
                      <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                          {log.employee.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-gray-800 truncate">{log.employee.name}</p>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                              {getStatusLabel(log.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <span>↓ {formatTime(log.checkInAt)}</span>
                            {log.checkOutAt && <span>↑ {formatTime(log.checkOutAt)}</span>}
                            {log.minutesLate > 0 && <span className="text-amber-600 font-semibold">Trễ {log.minutesLate}p</span>}
                            {mEarly > 0 && <span className="text-orange-500 font-semibold">Sớm {mEarly}p</span>}
                            {log.penaltyAmount > 0 && <span className="text-red-500 font-semibold">−{formatCurrency(log.penaltyAmount)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* "Chưa vào" chips nếu vẫn còn người chưa check-in */}
                {notCheckedInEmployees.length > 0 && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Chưa có mặt ({notCheckedInEmployees.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {notCheckedInEmployees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-500">
                          <div className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                            {emp.name.charAt(0)}
                          </div>
                          {emp.name.split(" ").slice(-1)[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Đang nghỉ phép */}
          {onLeaveToday.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-4">
              <p className="text-sm font-semibold text-purple-700 mb-3">Đang nghỉ phép hôm nay · {onLeaveToday.length} người</p>
              <div className="flex flex-wrap gap-2">
                {onLeaveToday.map((lr) => (
                  <span key={lr.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-200 rounded-xl text-xs text-purple-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
                    {lr.employee.name}
                    {lr.employee.department && <span className="text-purple-400 font-normal">· {lr.employee.department}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="space-y-4">

          {/* 7-day line charts */}
          {!isNewCompany && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Xu hướng 7 ngày</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Lượt chấm công / ngày */}
                <LineChart
                  label="Lượt chấm công / ngày"
                  data={chartDays.map(d => d.onTime + d.late)}
                  days={chartDays.map(d => d.label)}
                  color="#3b82f6"
                  dotColor="#2563eb"
                />
                {/* Đi trễ / ngày */}
                <LineChart
                  label="Đi trễ / ngày"
                  data={chartDays.map(d => d.late)}
                  days={chartDays.map(d => d.label)}
                  color="#f59e0b"
                  dotColor="#d97706"
                />
              </div>
            </div>
          )}

          {/* Top late this month */}
          {!isNewCompany && topLateEmployees.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Đến trễ nhiều nhất tháng</h2>
                <TrendingDown size={14} className="text-red-400" strokeWidth={2} />
              </div>
              <div className="space-y-3">
                {topLateEmployees.map((emp, idx) => {
                  const maxMin = topLateEmployees[0].totalMinutes;
                  const pct = Math.round((emp.totalMinutes / maxMin) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <span className={`w-5 text-[10px] font-extrabold shrink-0 ${idx === 0 ? "text-red-500" : idx === 1 ? "text-orange-400" : "text-gray-300"}`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate">{emp.name}</span>
                          <span className="text-[10px] text-gray-400 ml-1 shrink-0">{emp.totalMinutes}p · {emp.occurrences}x</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${idx === 0 ? "bg-red-400" : idx === 1 ? "bg-orange-400" : "bg-amber-300"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Expiring contracts */}
          {expiringContracts.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileWarning size={14} className="text-orange-500 shrink-0" />
                <h2 className="text-sm font-semibold text-orange-700">Hợp đồng sắp hết hạn</h2>
                <span className="ml-auto text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{expiringContracts.length}</span>
              </div>
              <div className="space-y-2.5">
                {expiringContracts.map((c) => {
                  const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={c.id} className="flex items-center gap-2 justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{c.employee.name}</p>
                        {c.employee.department && <p className="text-[10px] text-gray-400">{c.employee.department}</p>}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {daysLeft === 0 ? "Hôm nay" : `${daysLeft} ngày`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link href="/dashboard/employees" className="mt-3 flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700">
                Xem hợp đồng <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, Icon, color }: {
  label: string;
  value: number;
  sub: string;
  Icon: LucideIcon;
  color: string;
}) {
  const cfg: Record<string, { card: string; iconBg: string; icon: string; val: string }> = {
    blue:   { card: "bg-gradient-to-br from-blue-50 to-blue-100/60 border-blue-200",      iconBg: "bg-blue-100",    icon: "text-blue-600",    val: "text-blue-900" },
    green:  { card: "bg-gradient-to-br from-emerald-50 to-green-100/60 border-green-200", iconBg: "bg-emerald-100", icon: "text-emerald-600", val: "text-emerald-900" },
    yellow: { card: "bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-200",  iconBg: "bg-amber-100",   icon: "text-amber-600",   val: "text-amber-900" },
    gray:   { card: "bg-gradient-to-br from-gray-50 to-slate-100/60 border-gray-200",     iconBg: "bg-gray-200",    icon: "text-gray-500",    val: "text-gray-800" },
    purple: { card: "bg-gradient-to-br from-purple-50 to-violet-100/60 border-purple-200",iconBg: "bg-purple-100",  icon: "text-purple-600",  val: "text-purple-900" },
  };
  const c = cfg[color] ?? cfg.gray;
  return (
    <div className={`rounded-2xl border p-4 ${c.card}`}>
      <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center mb-3`}>
        <Icon size={18} strokeWidth={1.8} className={c.icon} />
      </div>
      <div className={`text-2xl font-extrabold leading-none ${c.val}`}>{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-1">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">{sub}</div>
    </div>
  );
}

function LineChart({ label, data, days, color, dotColor }: {
  label: string;
  data: number[];
  days: string[];
  color: string;
  dotColor: string;
}) {
  const W = 200, H = 60, PAD = 8;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return { x, y, v };
  });
  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-1.5">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 2} fill={i === points.length - 1 ? dotColor : color} />
        ))}
      </svg>
      <div className="flex justify-between mt-1">
        {days.map((d, i) => (
          <span key={i} className={`text-[9px] ${i === days.length - 1 ? "font-bold text-blue-600" : "text-gray-400"}`}>{d}</span>
        ))}
      </div>
    </div>
  );
}
