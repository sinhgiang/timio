import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodayString, formatTime, formatCurrency } from "@/lib/utils";
import { getStatusColor, getStatusLabel } from "@/lib/attendance";
import { Users, CheckCircle2, AlertTriangle, UserX, Monitor, ClipboardList, CalendarOff, type LucideIcon } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const today = getTodayString();

  const [totalEmployees, todayLogs, company, onLeaveToday] = await Promise.all([
    prisma.employee.count({ where: { companyId, status: "active" } }),
    prisma.attendanceLog.findMany({
      where: { employee: { companyId }, date: today },
      include: { employee: true },
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
  ]);

  const onTime = todayLogs.filter((l) => l.status === "on_time").length;
  const late = todayLogs.filter((l) => l.status === "late" || l.status === "very_late").length;
  const checkedIn = todayLogs.length;
  const notCheckedIn = totalEmployees - checkedIn;

  const todayDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  const checkInUrl = company?.slug ? `/checkin/${company.slug}` : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan hôm nay</h1>
          <p className="text-gray-500 text-sm capitalize mt-0.5">{todayDate}</p>
        </div>
        {checkInUrl && (
          <a
            href={checkInUrl}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Monitor size={15} />
            Mở màn hình chấm công
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Tổng nhân viên" value={totalEmployees} Icon={Users} color="blue" />
        <StatCard label="Đúng giờ" value={onTime} Icon={CheckCircle2} color="green" />
        <StatCard label="Đi trễ" value={late} Icon={AlertTriangle} color="yellow" />
        <StatCard label="Chưa vào" value={notCheckedIn} Icon={UserX} color="gray" />
        <StatCard label="Nghỉ phép hôm nay" value={onLeaveToday.length} Icon={CalendarOff} color="purple" />
      </div>

      {/* Nhân viên đang nghỉ */}
      {onLeaveToday.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-purple-700 mb-2">Đang nghỉ phép hôm nay ({onLeaveToday.length} người)</p>
          <div className="flex flex-wrap gap-2">
            {onLeaveToday.map((lr) => (
              <span key={lr.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-800">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                {lr.employee.name}
                {lr.employee.department && <span className="text-purple-400">· {lr.employee.department}</span>}
                <span className="text-purple-400">đến {lr.toDate.split("-").reverse().slice(0,2).join("/")}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">
            Chấm công hôm nay ({checkedIn}/{totalEmployees})
          </h2>
        </div>

        {todayLogs.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <ClipboardList size={44} strokeWidth={1.5} className="mb-3 text-gray-300" />
            <p>Chưa có nhân viên nào chấm công hôm nay</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Nhân viên</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Giờ vào</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Giờ ra</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Trạng thái</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Phạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {log.employee.name}
                      {log.employee.department && (
                        <span className="ml-2 text-xs text-gray-400">{log.employee.department}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-700">{formatTime(log.checkInAt)}</td>
                    <td className="px-5 py-3 font-mono text-gray-500">
                      {log.checkOutAt ? formatTime(log.checkOutAt) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {getStatusLabel(log.status)}
                        {log.minutesLate > 0 && ` (${log.minutesLate}p)`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-red-600 font-medium">
                      {log.penaltyAmount > 0 ? `-${formatCurrency(log.penaltyAmount)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
