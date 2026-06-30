import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayString, formatTime, formatCurrency } from "@/lib/utils";
import { getStatusColor, getStatusLabel } from "@/lib/attendance";
import { Users, CheckCircle2, AlertTriangle, UserX, Monitor, ClipboardList, CalendarOff, FileWarning, TrendingDown, type LucideIcon } from "lucide-react";
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

  // 7-day trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  // Contract expiry: next 30 days
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().slice(0, 10);

  // Top late: current month
  const monthStart = today.slice(0, 7) + "-01";

  const [totalEmployees, todayLogs, company, onLeaveToday, weekLogs, expiringContracts, thisMonthLateLogs] = await Promise.all([
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
      take: 10,
    }).catch(() => []),
    prisma.attendanceLog.findMany({
      where: { employee: empWhereNested, date: { gte: monthStart, lte: today }, minutesLate: { gt: 0 } },
      select: { employeeId: true, minutesLate: true, employee: { select: { name: true, department: true } } },
    }).catch(() => []),
  ]);

  // Build 7-day chart data
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

  // Top late employees this month
  const lateByEmployee = new Map<string, { name: string; department: string | null; totalMinutes: number; occurrences: number }>();
  for (const l of thisMonthLateLogs) {
    const entry = lateByEmployee.get(l.employeeId) ?? { name: l.employee.name, department: l.employee.department, totalMinutes: 0, occurrences: 0 };
    entry.totalMinutes += l.minutesLate;
    entry.occurrences += 1;
    lateByEmployee.set(l.employeeId, entry);
  }
  const topLateEmployees = Array.from(lateByEmployee.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 5);

  const onTime = todayLogs.filter((l) => l.status === "on_time").length;
  const late = todayLogs.filter((l) => l.status === "late" || l.status === "very_late").length;
  const checkedIn = todayLogs.length;
  const notCheckedIn = totalEmployees - checkedIn;

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
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tổng quan hôm nay</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{todayDate}</p>
        </div>
        {checkInUrl && (
          <a
            href={checkInUrl}
            target="_blank"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Monitor size={15} />
            Mở màn hình chấm công
          </a>
        )}
      </div>

      {/* Onboarding banner — dismissable, lưu localStorage */}
      {isNewCompany && <OnboardingBanner checkInUrl={checkInUrl} />}

      {/* Mobile quick-glance bar */}
      {!isNewCompany && (
        <div className="sm:hidden flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-3 mb-4 shadow-sm text-sm">
          <span className="text-gray-500">Hôm nay:</span>
          <span className="font-bold text-green-600">{onTime} đúng giờ</span>
          {late > 0 && <><span className="text-gray-300">·</span><span className="font-bold text-yellow-600">{late} trễ</span></>}
          {notCheckedIn > 0 && <><span className="text-gray-300">·</span><span className="font-bold text-gray-500">{notCheckedIn} chưa vào</span></>}
          {onLeaveToday.length > 0 && <><span className="text-gray-300">·</span><span className="font-bold text-purple-600">{onLeaveToday.length} nghỉ</span></>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Tổng NV" value={totalEmployees} Icon={Users} color="blue" />
        <StatCard label="Đúng giờ" value={onTime} Icon={CheckCircle2} color="green" />
        <StatCard label="Đi trễ" value={late} Icon={AlertTriangle} color="yellow" />
        <StatCard label="Chưa vào" value={notCheckedIn} Icon={UserX} color="gray" />
        <StatCard label="Nghỉ phép" value={onLeaveToday.length} Icon={CalendarOff} color="purple" />
      </div>

      {/* Nhân viên đang nghỉ */}
      {onLeaveToday.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-purple-700 mb-2">Đang nghỉ phép ({onLeaveToday.length} người)</p>
          <div className="flex flex-wrap gap-2">
            {onLeaveToday.map((lr) => (
              <span key={lr.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-800">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                {lr.employee.name}
                {lr.employee.department && <span className="text-purple-400">· {lr.employee.department}</span>}
                <span className="text-purple-400">đến {lr.toDate.split("-").reverse().slice(0, 2).join("/")}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hợp đồng sắp hết hạn */}
      {expiringContracts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
            <FileWarning size={15} className="shrink-0" />
            {expiringContracts.length} hợp đồng sắp hết hạn trong 30 ngày tới
          </p>
          <div className="flex flex-col gap-1.5">
            {expiringContracts.map((c) => {
              const daysLeft = Math.ceil((new Date(c.endDate!).getTime() - Date.now()) / 86400000);
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-800">{c.employee.name}</span>
                    {c.employee.department && <span className="text-xs text-gray-400 ml-2">{c.employee.department}</span>}
                    <span className="text-xs text-gray-400 ml-2">· {c.employee.code}</span>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                    {daysLeft === 0 ? "Hôm nay" : `${daysLeft} ngày`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-day trend chart */}
      {!isNewCompany && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">Xu hướng 7 ngày qua</h2>
          <div className="flex items-end gap-2 h-24">
            {chartDays.map((day, i) => {
              const total = day.onTime + day.late;
              const maxVal = Math.max(...chartDays.map((d) => d.onTime + d.late), 1);
              const barH = total === 0 ? 0 : Math.max(Math.round((total / maxVal) * 80), 4);
              const onTimeH = total === 0 ? 0 : Math.round((day.onTime / total) * barH);
              const lateH = barH - onTimeH;
              const isToday = i === 6;
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400 tabular-nums">{total > 0 ? total : ""}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
                    <div className="w-full flex flex-col rounded-sm overflow-hidden" style={{ height: barH || 2 }}>
                      {lateH > 0 && <div className="w-full bg-yellow-400" style={{ height: lateH }} />}
                      {onTimeH > 0 && <div className="w-full bg-green-400" style={{ height: onTimeH }} />}
                      {total === 0 && <div className="w-full bg-gray-100 rounded-sm" style={{ height: 2 }} />}
                    </div>
                  </div>
                  <span className={`text-xs ${isToday ? "font-bold text-blue-600" : "text-gray-400"}`}>{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />Đúng giờ</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" />Đi trễ</span>
          </div>
        </div>
      )}

      {/* SVG line charts — Xu hướng 7 ngày */}
      {!isNewCompany && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Chart 1: Lượt chấm công */}
          {(() => {
            const vals = chartDays.map((d) => d.onTime + d.late);
            const maxVal = Math.max(...vals, 1);
            const xStep = 240 / 6;
            const points = vals.map((v, i) => {
              const x = 20 + i * xStep;
              const y = 90 - Math.max((v / maxVal) * 80, 0);
              return `${x},${y}`;
            }).join(" ");
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Lượt chấm công / ngày</p>
                <svg viewBox="0 0 280 100" className="w-full">
                  {/* Grid line */}
                  <line x1="20" y1="10" x2="20" y2="90" stroke="#E5E7EB" strokeWidth="1" />
                  <line x1="20" y1="90" x2="260" y2="90" stroke="#E5E7EB" strokeWidth="1" />
                  {/* Polyline */}
                  <polyline points={points} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {/* Dots + labels */}
                  {vals.map((v, i) => {
                    const x = 20 + i * xStep;
                    const y = 90 - Math.max((v / maxVal) * 80, 0);
                    const isToday = i === 6;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={isToday ? 4 : 3} fill={isToday ? "#2563EB" : "#3B82F6"} />
                        {v > 0 && <text x={x} y={y - 7} fontSize="9" fill="#6B7280" textAnchor="middle">{v}</text>}
                        <text x={x} y="100" fontSize="9" fill={isToday ? "#2563EB" : "#9CA3AF"} textAnchor="middle" fontWeight={isToday ? "bold" : "normal"}>{chartDays[i].label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
          {/* Chart 2: Đi trễ */}
          {(() => {
            const vals = chartDays.map((d) => d.late);
            const maxVal = Math.max(...vals, 1);
            const xStep = 240 / 6;
            const points = vals.map((v, i) => {
              const x = 20 + i * xStep;
              const y = 90 - Math.max((v / maxVal) * 80, 0);
              return `${x},${y}`;
            }).join(" ");
            return (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Đi trễ / ngày</p>
                <svg viewBox="0 0 280 100" className="w-full">
                  <line x1="20" y1="10" x2="20" y2="90" stroke="#E5E7EB" strokeWidth="1" />
                  <line x1="20" y1="90" x2="260" y2="90" stroke="#E5E7EB" strokeWidth="1" />
                  <polyline points={points} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {vals.map((v, i) => {
                    const x = 20 + i * xStep;
                    const y = 90 - Math.max((v / maxVal) * 80, 0);
                    const isToday = i === 6;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={isToday ? 4 : 3} fill={isToday ? "#D97706" : "#F59E0B"} />
                        {v > 0 && <text x={x} y={y - 7} fontSize="9" fill="#6B7280" textAnchor="middle">{v}</text>}
                        <text x={x} y="100" fontSize="9" fill={isToday ? "#D97706" : "#9CA3AF"} textAnchor="middle" fontWeight={isToday ? "bold" : "normal"}>{chartDays[i].label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>
      )}

      {/* Top late employees this month */}
      {!isNewCompany && topLateEmployees.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-red-400" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-gray-600">Đến trễ nhiều nhất tháng này</h2>
          </div>
          <div className="space-y-2">
            {topLateEmployees.map((emp, idx) => {
              const maxMin = topLateEmployees[0].totalMinutes;
              const pct = Math.round((emp.totalMinutes / maxMin) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`w-5 text-xs font-bold shrink-0 ${idx === 0 ? "text-red-500" : idx === 1 ? "text-orange-500" : "text-gray-400"}`}>
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-gray-700 truncate">{emp.name}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">{emp.totalMinutes} phút · {emp.occurrences} lần</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${idx === 0 ? "bg-red-400" : idx === 1 ? "bg-orange-400" : "bg-yellow-400"}`}
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

      {/* Attendance section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">
            Chấm công hôm nay ({checkedIn}/{totalEmployees})
          </h2>
        </div>

        {todayLogs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <ClipboardList size={44} strokeWidth={1.5} className="mb-3 text-gray-300" />
            <p className="text-sm">
              {isNewCompany ? "Thêm nhân viên để bắt đầu chấm công" : "Chưa có nhân viên nào chấm công hôm nay"}
            </p>
            {isNewCompany && (
              <Link href="/dashboard/employees" className="mt-3 text-sm text-blue-600 font-medium hover:underline">
                Thêm nhân viên đầu tiên →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-gray-50">
              {todayLogs.map((log) => {
                const mEarly = calcMinutesEarly(log);
                const total = log.minutesLate + mEarly;
                return (
                  <div key={log.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{log.employee.name}</p>
                        {log.employee.department && (
                          <p className="text-xs text-gray-400 mt-0.5">{log.employee.department}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-mono flex-wrap">
                      <span>↓ {formatTime(log.checkInAt)}</span>
                      {log.checkOutAt && <span>↑ {formatTime(log.checkOutAt)}</span>}
                      {log.minutesLate > 0 && <span className="text-yellow-600 font-semibold">Trễ {log.minutesLate}p</span>}
                      {mEarly > 0 && <span className="text-orange-500 font-semibold">Sớm {mEarly}p</span>}
                      {log.penaltyAmount > 0 && (
                        <span className="text-red-500 font-semibold not-italic">−{formatCurrency(log.penaltyAmount)}</span>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="mt-1 text-xs text-gray-400">Tổng vi phạm: <span className="text-red-500 font-semibold">{total} phút</span></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Nhân viên</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Giờ vào</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Giờ ra</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Trạng thái</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Trễ vào</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Ra sớm</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Tổng</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">Phạt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {todayLogs.map((log) => {
                    const mEarly = calcMinutesEarly(log);
                    const total = log.minutesLate + mEarly;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {log.employee.name}
                          {log.employee.department && (
                            <span className="ml-2 text-xs text-gray-400">{log.employee.department}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">{formatTime(log.checkInAt)}</td>
                        <td className="px-4 py-3 font-mono text-gray-500">
                          {log.checkOutAt ? formatTime(log.checkOutAt) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {getStatusLabel(log.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {log.minutesLate > 0
                            ? <span className="text-yellow-600 font-semibold">{log.minutesLate} phút</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {mEarly > 0
                            ? <span className="text-orange-500 font-semibold">{mEarly} phút</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {total > 0
                            ? <span className="text-red-600 font-bold">{total} phút</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          {log.penaltyAmount > 0 ? `-${formatCurrency(log.penaltyAmount)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, Icon, color }: {
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
}) {
  const cardColors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    yellow: "bg-yellow-50 border-yellow-100",
    gray: "bg-gray-50 border-gray-100",
    purple: "bg-purple-50 border-purple-100",
  };
  const iconColors: Record<string, string> = {
    blue: "text-blue-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
    gray: "text-gray-400",
    purple: "text-purple-500",
  };

  return (
    <div className={`rounded-xl border p-4 ${cardColors[color] ?? cardColors.gray}`}>
      <div className="mb-3">
        <Icon size={26} strokeWidth={1.8} className={iconColors[color] ?? "text-gray-400"} />
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
