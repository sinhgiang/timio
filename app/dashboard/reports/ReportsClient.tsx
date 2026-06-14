"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatTime, getMonthDays } from "@/lib/utils";
import { getStatusColor } from "@/lib/attendance";

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
  branchName: string;
  baseSalary: number;
}

interface Log {
  id: string;
  employeeId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  minutesLate: number;
  minutesOvertime: number;
  status: string;
  penaltyAmount: number;
  overtimeAmount: number;
  overtimeStatus: string;
  note: string | null;
}

interface Summary {
  employeeId: string;
  employeeName: string;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalReward: number;
  totalMinutesOvertime: number;
  totalOvertimeAmount: number;
}

interface LeaveRecord {
  employeeId: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
}

interface Props {
  employees: Employee[];
  logs: Log[];
  summaries: Summary[];
  leaveRequests: LeaveRecord[];
  year: number;
  month: number;
}

function calcUnpaidLeaveDays(leaves: LeaveRecord[], employeeId: string, year: number, month: number): number {
  const pad = (n: number) => String(n).padStart(2, "0");
  const mStart = `${year}-${pad(month)}-01`;
  const mEnd = `${year}-${pad(month)}-31`;
  return leaves
    .filter((l) => l.employeeId === employeeId && l.type === "unpaid")
    .reduce((sum, l) => {
      const from = l.fromDate < mStart ? mStart : l.fromDate;
      const to = l.toDate > mEnd ? mEnd : l.toDate;
      if (to < from) return sum;
      const ms = new Date(to).getTime() - new Date(from).getTime();
      return sum + Math.round(ms / 86400000) + 1;
    }, 0);
}

export default function ReportsClient({ employees, logs, summaries, leaveRequests, year, month }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"summary" | "detail">("summary");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const monthDays = getMonthDays(year, month);
  const pendingOTCount = logs.filter((l) => l.overtimeStatus === "pending").length;

  const logMap = new Map<string, Log>();
  logs.forEach((l) => logMap.set(`${l.employeeId}-${l.date}`, l));

  const summaryMap = new Map<string, Summary>();
  summaries.forEach((s) => summaryMap.set(s.employeeId, s));

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    router.push(`/dashboard/reports?year=${y}&month=${m}`);
  };

  const exportEmployeeId =
    view === "detail" && selectedEmployeeId ? selectedEmployeeId : null;

  const handleExport = async (format: "xlsx" | "csv") => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
        format,
        ...(exportEmployeeId ? { employeeId: exportEmployeeId } : {}),
      });
      const res = await fetch(`/api/reports/export?${params}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const emp = exportEmployeeId
        ? employees.find(e => e.id === exportEmployeeId)
        : null;
      const base = emp
        ? `${emp.name.replace(/\s+/g, "-")}-thang${month}-${year}`
        : `bao-cao-${year}-${String(month).padStart(2, "0")}`;
      a.download = `${base}.${format === "csv" ? "csv" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Lỗi xuất file");
    } finally {
      setExporting(false);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) ?? null;

  const handleOTAction = async (logId: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/overtime/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) router.refresh();
    else alert("Lỗi cập nhật");
  };

  const goToEmployee = (id: string) => {
    setSelectedEmployeeId(id);
    setView("detail");
  };

  // ─── Chi tiết từng ngày cho 1 nhân viên ───────────────────────────────────
  const DayTable = ({ emp }: { emp: Employee }) => {
    const s = summaryMap.get(emp.id);
    const totalPenalty = s?.totalPenalty ?? 0;
    const totalReward = s?.totalReward ?? 0;
    const totalOTAmount = s?.totalOvertimeAmount ?? 0;
    const unpaidDays = calcUnpaidLeaveDays(leaveRequests, emp.id, year, month);
    const unpaidDeduction = emp.baseSalary > 0 ? Math.round((emp.baseSalary / 26) * unpaidDays) : 0;
    const netSalary = emp.baseSalary - totalPenalty + totalReward + totalOTAmount - unpaidDeduction;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header: tên + lương CB + thống kê */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <span className="font-semibold text-gray-800 text-base">{emp.name}</span>
              <span className="ml-2 text-sm text-gray-500">{emp.department} · {emp.branchName}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-500 font-medium">Lương cơ bản</span>
              <span className="text-base font-bold text-blue-700">{formatCurrency(emp.baseSalary)}</span>
            </div>
          </div>
          {s && (
            <div className="flex gap-4 text-sm flex-wrap mt-2">
              <span className="text-green-600">✅ {s.daysPresent} ngày có mặt</span>
              <span className="text-yellow-600">⚠️ {s.daysLate} lần trễ</span>
              {s.daysAbsent > 0 && <span className="text-red-500">❌ {s.daysAbsent} ngày vắng</span>}
              {s.totalMinutesLate > 0 && <span className="text-orange-400">⏱ Tổng trễ {s.totalMinutesLate}p</span>}
            </div>
          )}
        </div>

        {/* Bảng từng ngày */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Ngày</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Giờ vào</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Giờ ra</th>
                <th className="text-left px-4 py-2 text-gray-400 font-medium">Trạng thái</th>
                <th className="text-center px-3 py-2 text-gray-400 font-medium">Trễ (p)</th>
                <th className="text-center px-3 py-2 text-gray-400 font-medium">Tăng ca (p)</th>
                <th className="text-right px-4 py-2 text-gray-400 font-medium">Phạt / Thưởng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {monthDays.map((day) => {
                const log = logMap.get(`${emp.id}-${day}`);
                const dayNum = parseInt(day.split("-")[2]);
                const dow = new Date(day).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const statusLabel = log
                  ? log.status === "on_time" ? "Đúng giờ"
                  : log.status === "late" || log.status === "very_late" ? "Trễ"
                  : log.status === "early_leave" ? "Về sớm"
                  : log.status === "absent" ? "Vắng"
                  : log.status
                  : null;
                return (
                  <tr key={day} className={isWeekend ? "bg-gray-50/50" : "hover:bg-gray-50"}>
                    <td className={`px-4 py-2 font-mono ${isWeekend ? "text-gray-400" : "text-gray-600"}`}>
                      {dayNum}/{month}
                      {isWeekend && <span className="ml-1 text-gray-300 text-xs">CN</span>}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-700 font-medium">
                      {log?.checkInAt ? formatTime(new Date(log.checkInAt)) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 font-mono text-gray-500">
                      {log?.checkOutAt ? formatTime(new Date(log.checkOutAt)) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {statusLabel ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log!.status)}`}>
                          {statusLabel}
                        </span>
                      ) : isWeekend ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className="text-gray-300 text-xs">Chưa chấm</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {log?.minutesLate ? <span className="text-orange-500 font-medium">{log.minutesLate}p</span> : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {log?.minutesOvertime ? (
                        log.overtimeStatus === "pending" ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-orange-500 font-medium">{log.minutesOvertime}p ⏳</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleOTAction(log.id, "approve")}
                                className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 font-medium"
                              >Duyệt</button>
                              <button
                                onClick={() => handleOTAction(log.id, "reject")}
                                className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                              >Từ chối</button>
                            </div>
                          </div>
                        ) : log.overtimeStatus === "approved" ? (
                          <span className="text-blue-500 font-medium">{log.minutesOvertime}p ✓</span>
                        ) : (
                          <span className="text-gray-300 line-through">{log.minutesOvertime}p</span>
                        )
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right text-xs">
                      {log?.penaltyAmount ? <span className="text-red-500 font-medium">−{formatCurrency(log.penaltyAmount)}</span> : ""}
                      {log?.overtimeStatus === "approved" && log?.overtimeAmount ? <span className="text-green-600 font-medium ml-1">+{formatCurrency(log.overtimeAmount)}</span> : ""}
                      {!log?.penaltyAmount && log?.overtimeStatus !== "approved" && <span className="text-gray-200">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer tổng lương */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="text-gray-500">
                Lương CB: <span className="font-semibold text-blue-700">{formatCurrency(emp.baseSalary)}</span>
              </span>
              {totalPenalty > 0 && (
                <span className="text-red-500">
                  − Phạt: <span className="font-semibold">{formatCurrency(totalPenalty)}</span>
                </span>
              )}
              {unpaidDeduction > 0 && (
                <span className="text-orange-600" title={`Nghỉ không lương ${unpaidDays} ngày`}>
                  − Nghỉ KL ({unpaidDays}n): <span className="font-semibold">{formatCurrency(unpaidDeduction)}</span>
                </span>
              )}
              {totalReward > 0 && (
                <span className="text-green-600">
                  + Thưởng: <span className="font-semibold">{formatCurrency(totalReward)}</span>
                </span>
              )}
              {totalOTAmount > 0 && (
                <span className="text-blue-500">
                  + Tăng ca: <span className="font-semibold">{formatCurrency(totalOTAmount)}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Thực nhận tháng {month}:</span>
              <span className={`text-lg font-bold ${netSalary < emp.baseSalary ? "text-red-600" : "text-green-700"}`}>
                {formatCurrency(netSalary)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Banner cảnh báo tăng ca chờ duyệt */}
      {pendingOTCount > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
          <span className="text-lg">⏳</span>
          <span>Có <strong>{pendingOTCount}</strong> yêu cầu tăng ca chờ duyệt trong tháng này. Vào <strong>Chi tiết</strong> từng nhân viên để duyệt.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Báo cáo tháng</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month picker */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
            <button onClick={() => changeMonth(-1)} className="text-gray-500 hover:text-gray-800 font-bold">‹</button>
            <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">Tháng {month}/{year}</span>
            <button onClick={() => changeMonth(1)} className="text-gray-500 hover:text-gray-800 font-bold">›</button>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => { setView("summary"); setSelectedEmployeeId(null); }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${view === "summary" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Tổng kết</button>
            <button
              onClick={() => {
                if (!selectedEmployeeId && employees.length > 0) {
                  setSelectedEmployeeId(employees[0].id);
                }
                setView("detail");
              }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${view === "detail" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >Chi tiết</button>
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? "Đang xuất..." : (
                <>
                  <span>📥 Xuất</span>
                  <span className="text-green-200 text-xs">
                    {exportEmployeeId
                      ? `(${employees.find(e => e.id === exportEmployeeId)?.name.split(" ").pop()})`
                      : "(tất cả)"}
                  </span>
                  <span className="text-xs">▾</span>
                </>
              )}
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => handleExport("xlsx")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">📊</span>
                    <div className="text-left">
                      <div className="font-medium">Excel</div>
                      <div className="text-xs text-gray-400">.xlsx — mở bằng Excel</div>
                    </div>
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">🔗</span>
                    <div className="text-left">
                      <div className="font-medium">Google Sheets</div>
                      <div className="text-xs text-gray-400">.csv — import vào Sheets</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tổng kết view ── */}
      {view === "summary" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Nhân viên</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Đi làm</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Trễ</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Vắng</th>
                <th className="text-right px-4 py-3 text-blue-500 font-medium">Lương CB</th>
                <th className="text-right px-4 py-3 text-red-400 font-medium">Phạt</th>
                <th className="text-right px-4 py-3 text-orange-500 font-medium">Nghỉ KL</th>
                <th className="text-right px-4 py-3 text-green-500 font-medium">Thưởng</th>
                <th className="text-right px-4 py-3 text-blue-400 font-medium">Tăng ca</th>
                <th className="text-right px-5 py-3 text-gray-700 font-semibold">Thực nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => {
                const s = summaryMap.get(emp.id);
                const totalPenalty = s?.totalPenalty ?? 0;
                const totalReward = s?.totalReward ?? 0;
                const totalOTAmount = s?.totalOvertimeAmount ?? 0;
                const unpaidDaysSummary = calcUnpaidLeaveDays(leaveRequests, emp.id, year, month);
                const unpaidDeductionSummary = emp.baseSalary > 0 ? Math.round((emp.baseSalary / 26) * unpaidDaysSummary) : 0;
                const netSalary = emp.baseSalary - totalPenalty + totalReward + totalOTAmount - unpaidDeductionSummary;
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-blue-50 cursor-pointer group transition-colors"
                    onClick={() => goToEmployee(emp.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                          {emp.name.split(" ").pop()?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.department ?? emp.branchName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-gray-700">{s?.daysPresent ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={s?.daysLate ? "text-yellow-600 font-semibold" : "text-gray-300"}>{s?.daysLate ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={s?.daysAbsent ? "text-red-500 font-semibold" : "text-gray-300"}>{s?.daysAbsent ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700 font-medium">
                      {emp.baseSalary > 0 ? formatCurrency(emp.baseSalary) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">{totalPenalty ? `−${formatCurrency(totalPenalty)}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-orange-600" title={unpaidDaysSummary > 0 ? `${unpaidDaysSummary} ngày nghỉ không lương` : ""}>
                      {unpaidDeductionSummary > 0 ? `−${formatCurrency(unpaidDeductionSummary)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">{totalReward ? `+${formatCurrency(totalReward)}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{totalOTAmount ? `+${formatCurrency(totalOTAmount)}` : <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-right">
                      {emp.baseSalary > 0 ? (
                        <span className={`font-bold text-base ${netSalary < emp.baseSalary ? "text-red-600" : "text-green-700"}`}>
                          {formatCurrency(netSalary)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Chi tiết view ── */}
      {view === "detail" && (
        <div>
          {/* Dropdown điều hướng */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select
              value={selectedEmployeeId ?? ""}
              onChange={(e) => setSelectedEmployeeId(e.target.value || null)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {selectedEmployeeId && (
              <>
                <button
                  onClick={() => {
                    const idx = employees.findIndex(e => e.id === selectedEmployeeId);
                    if (idx > 0) setSelectedEmployeeId(employees[idx - 1].id);
                  }}
                  disabled={employees.findIndex(e => e.id === selectedEmployeeId) === 0}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                >‹</button>
                <button
                  onClick={() => {
                    const idx = employees.findIndex(e => e.id === selectedEmployeeId);
                    if (idx < employees.length - 1) setSelectedEmployeeId(employees[idx + 1].id);
                  }}
                  disabled={employees.findIndex(e => e.id === selectedEmployeeId) === employees.length - 1}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30"
                >›</button>
              </>
            )}
          </div>

          {selectedEmployee === null ? (
            /* Tất cả nhân viên */
            <div className="space-y-4">
              {employees.map((emp) => (
                <DayTable key={emp.id} emp={emp} />
              ))}
            </div>
          ) : (
            /* 1 người */
            <DayTable emp={selectedEmployee} />
          )}
        </div>
      )}
    </div>
  );
}
