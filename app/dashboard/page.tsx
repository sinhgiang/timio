import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayString, formatTime, formatCurrency } from "@/lib/utils";
import { getStatusColor, getStatusLabel } from "@/lib/attendance";
import {
  Users, CheckCircle2, AlertTriangle, UserX, Monitor, Banknote,
  ClipboardList, CalendarOff, FileWarning, ClipboardEdit, ArrowRight, BarChart3,
  UserPlus, Building2, Settings, Clock, ShieldCheck, TrendingUp, ChevronRight, Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import OnboardingBanner from "@/components/dashboard/OnboardingBanner";
import { branchWhere, employeeBranchWhere } from "@/lib/branchScope";

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
    allEmployees, totalEmployees, todayLogs, company, onLeaveToday, weekLogs,
    expiringContracts, thisMonthLateLogs, pendingLeaveCount, pendingCorrectionCount,
    deptGroups, salaryAgg, monthTotalLogs, monthOnTimeLogs, recentActivity,
  ] = await Promise.all([
    prisma.employee.findMany({ where: empFilter, select: { id: true, name: true, code: true, department: true, avatarUrl: true }, orderBy: { name: "asc" } }),
    prisma.employee.count({ where: empFilter }),
    prisma.attendanceLog.findMany({ where: { employee: empWhereNested, date: today }, include: { employee: { include: { branch: true } } }, orderBy: { checkInAt: "asc" } }),
    prisma.company.findUnique({ where: { id: companyId }, include: { branches: true } }),
    prisma.leaveRequest.findMany({ where: { companyId, status: "approved", fromDate: { lte: today }, toDate: { gte: today }, ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}) }, include: { employee: { select: { name: true, department: true, code: true } } } }),
    prisma.attendanceLog.findMany({ where: { employee: empWhereNested, date: { gte: sevenDaysAgoStr, lte: today } }, select: { date: true, status: true } }),
    prisma.contract.findMany({ where: { endDate: { not: null, gte: today, lte: in30DaysStr }, employee: { ...empWhereNested, status: "active" } }, select: { id: true, endDate: true, type: true, employee: { select: { name: true, code: true, department: true } } }, orderBy: { endDate: "asc" }, take: 5 }).catch(() => []),
    prisma.attendanceLog.findMany({ where: { employee: empWhereNested, date: { gte: monthStart, lte: today }, minutesLate: { gt: 0 } }, select: { employeeId: true, minutesLate: true, employee: { select: { name: true, department: true } } } }).catch(() => []),
    prisma.leaveRequest.count({ where: { companyId, status: "pending", ...employeeBranchWhere(u) } }).catch(() => 0),
    prisma.correctionRequest.count({ where: { status: "pending", employee: { companyId, ...branchWhere(u) } } }).catch(() => 0),
    prisma.employee.groupBy({ by: ["department"], where: empFilter, _count: { _all: true } }).catch(() => [] as { department: string | null; _count: { _all: number } }[]),
    prisma.employee.aggregate({ where: empFilter, _sum: { baseSalary: true } }).catch(() => ({ _sum: { baseSalary: 0 } })),
    prisma.attendanceLog.count({ where: { employee: empWhereNested, date: { gte: monthStart, lte: today }, checkInAt: { not: null } } }).catch(() => 0),
    prisma.attendanceLog.count({ where: { employee: empWhereNested, date: { gte: monthStart, lte: today }, status: "on_time" } }).catch(() => 0),
    prisma.attendanceLog.findMany({ where: { employee: empWhereNested, checkInAt: { not: null } }, orderBy: { checkInAt: "desc" }, take: 7, include: { employee: { select: { name: true, department: true } } } }).catch(() => []),
  ]);

  // 7-ngày cho biểu đồ cột
  const chartDays: { label: string; onTime: number; late: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = weekLogs.filter((l) => l.date === dateStr);
    chartDays.push({
      label: d.toLocaleDateString("vi-VN", { weekday: "short", timeZone: "Asia/Ho_Chi_Minh" }),
      onTime: dayLogs.filter((l) => l.status === "on_time").length,
      late: dayLogs.filter((l) => l.status === "late" || l.status === "very_late").length,
    });
  }
  const maxBar = Math.max(...chartDays.map((d) => d.onTime + d.late), 1);

  // Top đến trễ tháng
  const lateByEmployee = new Map<string, { name: string; department: string | null; totalMinutes: number; occurrences: number }>();
  for (const l of thisMonthLateLogs) {
    const e = lateByEmployee.get(l.employeeId) ?? { name: l.employee.name, department: l.employee.department, totalMinutes: 0, occurrences: 0 };
    e.totalMinutes += l.minutesLate; e.occurrences += 1;
    lateByEmployee.set(l.employeeId, e);
  }
  const topLate = Array.from(lateByEmployee.values()).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 4);

  const onTime = todayLogs.filter((l) => l.status === "on_time").length;
  const late = todayLogs.filter((l) => l.status === "late" || l.status === "very_late").length;
  const checkedIn = todayLogs.length;
  const notCheckedIn = totalEmployees - checkedIn;
  const checkInRate = totalEmployees > 0 ? Math.round((checkedIn / totalEmployees) * 100) : 0;
  const checkedInIds = new Set(todayLogs.map((l) => l.employee.id));
  const notCheckedInEmployees = allEmployees.filter((e) => !checkedInIds.has(e.id));

  const totalBaseSalary = salaryAgg._sum.baseSalary ?? 0;
  const monthHealth = monthTotalLogs > 0 ? Math.round((monthOnTimeLogs / monthTotalLogs) * 100) : 0;
  const deptList = (deptGroups as { department: string | null; _count: { _all: number } }[])
    .map((g) => ({ name: g.department || "Chưa phân bổ", count: g._count._all }))
    .sort((a, b) => b.count - a.count).slice(0, 6);
  const deptMax = Math.max(...deptList.map((d) => d.count), 1);
  const pendingTotal = pendingLeaveCount + pendingCorrectionCount + expiringContracts.length;

  const todayDate = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const checkInUrl = company?.slug ? `/checkin/${company.slug}` : null;
  const isNewCompany = totalEmployees === 0;
  const planLabel = ({ starter: "Miễn phí", pro: "PRO", business: "BUSINESS" } as Record<string, string>)[company?.plan ?? "starter"] ?? "Miễn phí";

  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const calcMinutesEarly = (log: typeof todayLogs[0]): number => {
    if (!log.checkOutAt) return 0;
    let checkOutTime = log.employee.branch.checkOutTime;
    try { const ov = log.employee.shiftOverride ? JSON.parse(log.employee.shiftOverride) : {}; if (ov.checkOutTime) checkOutTime = ov.checkOutTime; } catch { /* */ }
    const [coH, coM] = checkOutTime.split(":").map(Number);
    const scheduledMinutes = coH * 60 + coM;
    const actualMinutes = Math.floor(((log.checkOutAt.getTime() + VN_OFFSET_MS) % (24 * 60 * 60 * 1000)) / 60000);
    const diff = scheduledMinutes - actualMinutes;
    return diff > (log.employee.branch.gracePeriod ?? 5) ? diff : 0;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tổng quan</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{todayDate}</p>
        </div>
        {checkInUrl && (
          <a href={checkInUrl} target="_blank" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
            <Monitor size={15} /> Mở màn hình chấm công
          </a>
        )}
      </div>

      {isNewCompany && <OnboardingBanner checkInUrl={checkInUrl} />}

      {/* ── HÀNG 1: Tổng quan chart | Stat cards | Thẻ công ty ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Overview + bar chart */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-4xl font-extrabold text-gray-900 leading-none">{checkedIn}<span className="text-lg text-gray-300 font-bold">/{totalEmployees}</span></p>
              <p className="text-sm text-gray-500 mt-1">Đã chấm công hôm nay</p>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">7 ngày</span>
          </div>
          {/* Bar chart */}
          <div className="mt-5">
            <div className="flex items-end gap-2 h-40">
              {chartDays.map((d, i) => {
                const total = d.onTime + d.late;
                const h = (total / maxBar) * 100;
                const lateH = total > 0 ? (d.late / total) * 100 : 0;
                const isToday = i === chartDays.length - 1;
                return (
                  <div key={i} className="flex-1 flex items-end justify-center h-full">
                    <div className={`w-full max-w-[30px] rounded-t-lg overflow-hidden flex flex-col-reverse ${total > 0 ? "bg-blue-500" : "bg-gray-100"} ${isToday ? "ring-2 ring-blue-200 ring-offset-1" : ""}`} style={{ height: `${Math.max(h, 3)}%` }} title={`${d.label}: ${d.onTime} đúng giờ, ${d.late} trễ`}>
                      {d.late > 0 && <div className="bg-amber-400 w-full" style={{ height: `${lateH}%` }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              {chartDays.map((d, i) => (
                <span key={i} className={`flex-1 text-center text-[10px] ${i === chartDays.length - 1 ? "font-bold text-blue-600" : "text-gray-400"}`}>{d.label}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Đúng giờ</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Đi trễ</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
          <MiniStat label="Tổng nhân viên" value={String(totalEmployees)} sub={`${deptList.length} phòng ban`} Icon={Users} />
          <MiniStat label="Quỹ lương tháng" value={formatCurrency(totalBaseSalary)} sub="lương cơ bản" Icon={Banknote} accent />
          <MiniStat label="Đúng giờ tháng" value={`${monthHealth}%`} sub={`${monthOnTimeLogs}/${monthTotalLogs} lượt`} Icon={CheckCircle2} />
        </div>

        {/* Thẻ công ty + quick actions + team + hoạt động */}
        <div className="xl:col-span-4 space-y-4">
          {/* Thẻ công ty */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2"><Building2 size={18} /><span className="text-sm font-medium text-blue-100">Công ty</span></div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">{planLabel}</span>
            </div>
            <p className="text-xl font-bold mt-3 relative">{company?.name ?? "Công ty"}</p>
            <div className="flex items-center gap-5 mt-3 relative">
              <div><p className="text-2xl font-extrabold leading-none">{totalEmployees}</p><p className="text-[11px] text-blue-200">Nhân viên</p></div>
              <div><p className="text-2xl font-extrabold leading-none">{company?.branches?.length ?? 0}</p><p className="text-[11px] text-blue-200">Chi nhánh</p></div>
              <div><p className="text-2xl font-extrabold leading-none">{checkInRate}%</p><p className="text-[11px] text-blue-200">Đã vào</p></div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 grid grid-cols-4 gap-1">
            <QuickAct href={checkInUrl ?? "/dashboard"} label="Kiosk" Icon={Monitor} external={!!checkInUrl} />
            <QuickAct href="/dashboard/reports" label="Báo cáo" Icon={BarChart3} />
            <QuickAct href="/dashboard/employees" label="Thêm NV" Icon={UserPlus} />
            <QuickAct href="/dashboard/settings" label="Cài đặt" Icon={Settings} />
          </div>

          {/* Hoạt động gần đây */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Hoạt động gần đây</p>
              <Link href="/dashboard/reports" className="text-[11px] text-blue-600 flex items-center gap-0.5">Tất cả <ChevronRight size={12} /></Link>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Chưa có hoạt động.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">{a.employee.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{a.employee.name} <span className="text-gray-400 font-normal">chấm công</span></p>
                      <p className="text-[11px] text-gray-400">{new Date(a.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} · {formatTime(a.checkInAt)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(a.status)}`}>{getStatusLabel(a.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── HÀNG 2: Chuyên cần hôm nay | Gợi ý ── */}
      {!isNewCompany && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Tỷ lệ đi làm hôm nay</p>
                <p className="text-xs text-gray-400 mt-0.5">{checkedIn} đã vào · {notCheckedIn} chưa · {onLeaveToday.length} nghỉ phép</p>
              </div>
              <p className="text-2xl font-extrabold text-blue-600">{checkInRate}%</p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-blue-500 h-full" style={{ width: `${totalEmployees ? (onTime / totalEmployees) * 100 : 0}%` }} title={`Đúng giờ ${onTime}`} />
              <div className="bg-amber-400 h-full" style={{ width: `${totalEmployees ? (late / totalEmployees) * 100 : 0}%` }} title={`Trễ ${late}`} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
              <span>{onTime} đúng giờ · {late} trễ</span>
              <span>Mục tiêu 100%</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 mb-2"><Sparkles size={16} className="text-indigo-500" /><p className="text-sm font-semibold text-gray-800">Gợi ý cho bạn</p></div>
            <ul className="space-y-2 text-sm text-gray-600">
              {notCheckedIn > 0 && <li className="flex gap-2"><span className="text-indigo-400">•</span> {notCheckedIn} nhân viên chưa chấm công — nhắc qua Zalo/Email từ Trợ lý AI.</li>}
              {pendingLeaveCount > 0 && <li className="flex gap-2"><span className="text-indigo-400">•</span> {pendingLeaveCount} đơn nghỉ phép đang chờ duyệt.</li>}
              {monthHealth < 90 && monthTotalLogs > 0 && <li className="flex gap-2"><span className="text-indigo-400">•</span> Tỷ lệ đúng giờ tháng {monthHealth}% — cân nhắc nhắc ca cho nhân viên hay trễ.</li>}
              {notCheckedIn === 0 && pendingLeaveCount === 0 && <li className="flex gap-2"><span className="text-green-500">•</span> Mọi thứ gọn gàng hôm nay. Làm tốt lắm!</li>}
            </ul>
          </div>
        </div>
      )}

      {/* ── HÀNG 3: Phòng ban | Sức khỏe | Cần xử lý ── */}
      {!isNewCompany && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Phân tích phòng ban */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 mb-1">Phân bổ phòng ban</p>
            <p className="text-2xl font-extrabold text-gray-900">{totalEmployees}<span className="text-sm text-gray-400 font-semibold"> nhân viên</span></p>
            <div className="space-y-2.5 mt-4">
              {deptList.map((d, i) => {
                const pct = Math.round((d.count / totalEmployees) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 truncate">{d.name}</span>
                      <span className="text-gray-400 font-medium shrink-0 ml-2">{d.count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${(d.count / deptMax) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sức khỏe chấm công (gauge) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-1"><ShieldCheck size={16} className="text-blue-600" /><p className="text-sm font-semibold text-gray-800">Sức khỏe chấm công</p></div>
            <p className="text-xs text-gray-400">Tỷ lệ đúng giờ trong tháng</p>
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <Gauge value={monthHealth} />
              <p className="text-3xl font-extrabold text-gray-900 -mt-6">{monthHealth}%</p>
              <p className="text-xs text-gray-400 mt-1">{monthHealth >= 90 ? "Rất tốt" : monthHealth >= 75 ? "Ổn định" : "Cần cải thiện"}</p>
            </div>
            <p className="text-[11px] text-gray-400 text-center">Dựa trên {monthTotalLogs} lượt chấm công tháng này</p>
          </div>

          {/* Cần xử lý */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Cần xử lý</p>
              {pendingTotal > 0 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">{pendingTotal}</span>}
            </div>
            <div className="space-y-2">
              <TodoRow href="/dashboard/leave" Icon={CalendarOff} label="Nghỉ phép chờ duyệt" count={pendingLeaveCount} color="orange" />
              <TodoRow href="/dashboard/corrections" Icon={ClipboardEdit} label="Điều chỉnh chấm công" count={pendingCorrectionCount} color="blue" />
              <TodoRow href="/dashboard/employees" Icon={FileWarning} label="Hợp đồng sắp hết hạn" count={expiringContracts.length} color="red" />
              <TodoRow href="/dashboard/employees" Icon={UserX} label="Chưa chấm công hôm nay" count={notCheckedIn} color="gray" />
            </div>
            {topLate.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Đến trễ nhiều nhất tháng</p>
                <div className="space-y-1.5">
                  {topLate.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate">{e.name}</span>
                      <span className="text-gray-400 shrink-0 ml-2">{e.totalMinutes}p · {e.occurrences}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chấm công hôm nay (bảng chi tiết) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Chấm công hôm nay</h2>
            <p className="text-xs text-gray-400 mt-0.5">{checkedIn}/{totalEmployees} nhân viên đã vào</p>
          </div>
          {totalEmployees > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${checkInRate === 100 ? "bg-emerald-400" : checkInRate > 50 ? "bg-blue-400" : "bg-amber-400"}`} style={{ width: `${checkInRate}%` }} /></div>
              <span className="text-xs font-bold text-gray-500">{checkInRate}%</span>
            </div>
          )}
        </div>

        {todayLogs.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <ClipboardList size={40} strokeWidth={1.2} className="mb-3 text-gray-200" />
            <p className="text-sm">{isNewCompany ? "Thêm nhân viên để bắt đầu chấm công" : "Chưa có nhân viên nào chấm công hôm nay"}</p>
            {isNewCompany && <Link href="/dashboard/employees" className="mt-3 text-sm text-blue-600 font-medium hover:underline">Thêm nhân viên đầu tiên →</Link>}
          </div>
        ) : (
          <>
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
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">{log.employee.name.charAt(0)}</div>
                            <div><div className="font-medium text-gray-800">{log.employee.name}</div>{log.employee.department && <div className="text-xs text-gray-400">{log.employee.department}</div>}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">{formatTime(log.checkInAt)}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">{log.checkOutAt ? formatTime(log.checkOutAt) : <span className="text-gray-200">—</span>}</td>
                        <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>{getStatusLabel(log.status)}</span></td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{log.minutesLate > 0 ? <span className="text-amber-600 font-bold">+{log.minutesLate}p trễ</span> : mEarly > 0 ? <span className="text-orange-500 font-bold">−{mEarly}p sớm</span> : <span className="text-gray-200">—</span>}</td>
                        <td className="px-5 py-3 text-right">{log.penaltyAmount > 0 ? <span className="text-red-600 font-semibold text-xs">−{formatCurrency(log.penaltyAmount)}</span> : <span className="text-gray-200">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-50">
              {todayLogs.map((log) => {
                const mEarly = calcMinutesEarly(log);
                return (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">{log.employee.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-800 truncate">{log.employee.name}</p>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>{getStatusLabel(log.status)}</span>
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
            {notCheckedInEmployees.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Chưa có mặt ({notCheckedInEmployees.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {notCheckedInEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-500">
                      <div className="w-3.5 h-3.5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white shrink-0">{emp.name.charAt(0)}</div>
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
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />{lr.employee.name}
                {lr.employee.department && <span className="text-purple-400 font-normal">· {lr.employee.department}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, Icon, accent }: { label: string; value: string; sub: string; Icon: LucideIcon; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "bg-gradient-to-br from-blue-600 to-indigo-700 border-transparent text-white" : "bg-white border-gray-100 shadow-sm"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent ? "bg-white/15" : "bg-blue-50"}`}>
        <Icon size={18} strokeWidth={1.8} className={accent ? "text-white" : "text-blue-600"} />
      </div>
      <div className={`text-xl font-extrabold leading-none ${accent ? "text-white" : "text-gray-900"}`}>{value}</div>
      <div className={`text-xs font-semibold mt-1.5 ${accent ? "text-blue-100" : "text-gray-700"}`}>{label}</div>
      <div className={`text-[10px] mt-0.5 ${accent ? "text-blue-200" : "text-gray-400"}`}>{sub}</div>
    </div>
  );
}

function QuickAct({ href, label, Icon, external }: { href: string; label: string; Icon: LucideIcon; external?: boolean }) {
  const inner = (
    <div className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center"><Icon size={17} className="text-blue-600" /></div>
      <span className="text-[11px] font-medium text-gray-600">{label}</span>
    </div>
  );
  return external ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : <Link href={href}>{inner}</Link>;
}

function TodoRow({ href, Icon, label, count, color }: { href: string; Icon: LucideIcon; label: string; count: number; color: string }) {
  const c: Record<string, string> = { orange: "bg-orange-50 text-orange-600", blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600", gray: "bg-gray-100 text-gray-500" };
  return (
    <Link href={href} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c[color] ?? c.gray}`}><Icon size={15} /></div>
      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{label}</span>
      {count > 0 ? <span className="text-sm font-bold text-gray-800 shrink-0">{count}</span> : <span className="text-xs text-gray-300 shrink-0">0</span>}
      <ChevronRight size={14} className="text-gray-300 shrink-0" />
    </Link>
  );
}

function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 140 78" className="w-full max-w-[190px]">
      <path d="M12 70 A58 58 0 0 1 128 70" fill="none" stroke="#eef2f7" strokeWidth="13" strokeLinecap="round" pathLength={100} />
      <path d="M12 70 A58 58 0 0 1 128 70" fill="none" stroke="url(#gaugeGrad)" strokeWidth="13" strokeLinecap="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - v} />
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
