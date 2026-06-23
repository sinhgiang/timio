import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayString, formatTime, formatCurrency } from "@/lib/utils";
import { getStatusColor, getStatusLabel } from "@/lib/attendance";
import { Users, CheckCircle2, AlertTriangle, UserX, Monitor, ClipboardList, CalendarOff, UserPlus, Scan, ExternalLink, type LucideIcon } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const today = getTodayString();

  // 7-day trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [totalEmployees, todayLogs, company, onLeaveToday, weekLogs] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: "active" } }),
    prisma.attendanceLog.findMany({
      where: { employee: { companyId }, date: today },
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
      },
      include: { employee: { select: { name: true, department: true, code: true } } },
    }),
    prisma.attendanceLog.findMany({
      where: { employee: { companyId }, date: { gte: sevenDaysAgoStr, lte: today } },
      select: { date: true, status: true },
    }),
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

      {/* Onboarding: hiện khi công ty mới chưa có nhân viên */}
      {isNewCompany && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Bắt đầu nào 🚀</p>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Thiết lập Timio trong 3 bước</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/dashboard/employees" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 transition-colors">
                <UserPlus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-0.5">1. Thêm nhân viên</p>
              <p className="text-xs text-gray-500">Thêm danh sách nhân viên của công ty</p>
            </Link>
            <Link href="/dashboard/employees" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-600 transition-colors">
                <Scan className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-gray-900 text-sm mb-0.5">2. Đăng ký khuôn mặt</p>
              <p className="text-xs text-gray-500">Chụp ảnh để nhận diện khi chấm công</p>
            </Link>
            {checkInUrl ? (
              <a href={checkInUrl} target="_blank" className="group bg-white rounded-xl p-4 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-600 transition-colors">
                  <ExternalLink className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-0.5">3. Mở kiosk chấm công</p>
                <p className="text-xs text-gray-500">Đặt màn hình tại văn phòng để check-in</p>
              </a>
            ) : (
              <div className="bg-white rounded-xl p-4 border border-blue-100 opacity-50">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                  <ExternalLink className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-0.5">3. Mở kiosk chấm công</p>
                <p className="text-xs text-gray-500">Cần tạo chi nhánh trước</p>
              </div>
            )}
          </div>
        </div>
      )}

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
