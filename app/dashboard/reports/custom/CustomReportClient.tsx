"use client";

import { useState, useCallback } from "react";
import { Filter, Download, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  code: string;
  department: string;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalMinutesOvertime: number;
  totalOvertimeAmount: number;
  checkIns: number;
}

interface ReportData {
  employees: EmployeeRow[];
  from: string;
  to: string;
  totalDays: number;
}

interface Props {
  employees: EmployeeOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomReportClient({ employees }: Props) {
  const [from, setFrom] = useState(firstOfMonthStr());
  const [to, setTo] = useState(todayStr());
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildParams = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams({ from, to });
    if (employeeId) params.set("employeeId", employeeId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  }, [from, to, employeeId]);

  const handleGenerate = useCallback(async () => {
    if (!from || !to) { setError("Vui lòng chọn ngày bắt đầu và kết thúc"); return; }
    if (from > to) { setError("Ngày bắt đầu phải trước ngày kết thúc"); return; }
    setError("");
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/reports/custom?${buildParams()}`);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Lỗi không xác định");
      }
      const json = (await res.json()) as ReportData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, [buildParams, from, to]);

  const handleExcel = useCallback(() => {
    window.location.href = `/api/reports/custom?${buildParams({ format: "excel" })}`;
  }, [buildParams]);

  // Totals
  const totals = data
    ? data.employees.reduce(
        (acc, r) => ({
          daysPresent: acc.daysPresent + r.daysPresent,
          daysAbsent: acc.daysAbsent + r.daysAbsent,
          daysLate: acc.daysLate + r.daysLate,
          totalMinutesLate: acc.totalMinutesLate + r.totalMinutesLate,
          totalPenalty: acc.totalPenalty + r.totalPenalty,
          totalMinutesOvertime: acc.totalMinutesOvertime + r.totalMinutesOvertime,
          totalOvertimeAmount: acc.totalOvertimeAmount + r.totalOvertimeAmount,
        }),
        { daysPresent: 0, daysAbsent: 0, daysLate: 0, totalMinutesLate: 0, totalPenalty: 0, totalMinutesOvertime: 0, totalOvertimeAmount: 0 }
      )
    : null;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
          <Filter className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Báo cáo tùy chỉnh</h1>
          <p className="text-sm text-gray-500">Chọn khoảng thời gian và nhân viên để xem báo cáo chi tiết</p>
        </div>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nhân viên</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Filter className="w-4 h-4" strokeWidth={1.5} />
              )}
              Tạo báo cáo
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!loading && data && (
        <>
          {/* Meta row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                {data.from} → {data.to}
              </span>
              <span className="text-gray-400">·</span>
              <span>{data.totalDays} ngày làm việc</span>
              <span className="text-gray-400">·</span>
              <span>{data.employees.length} nhân viên</span>
            </div>
            <button
              onClick={handleExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              Xuất Excel
            </button>
          </div>

          {data.employees.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <p>Không có dữ liệu cho khoảng thời gian này</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Nhân viên</th>
                      <th className="text-left px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Phòng ban</th>
                      <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Có mặt</th>
                      <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Vắng</th>
                      <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Trễ</th>
                      <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Tổng trễ (phút)</th>
                      <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Phạt (đ)</th>
                      <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">OT (phút)</th>
                      <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">OT (đ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.employees.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-800">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.code}</p>
                        </td>
                        <td className="px-3 py-3 text-gray-600">{r.department}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-semibold text-green-600">{r.daysPresent}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.daysAbsent > 0 ? (
                            <span className="font-semibold text-red-600">{r.daysAbsent}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.daysLate > 0 ? (
                            <span className="font-semibold text-orange-500">{r.daysLate}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {r.totalMinutesLate > 0 ? r.totalMinutesLate : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.totalPenalty > 0 ? (
                            <span className="font-medium text-red-600">{fmtVnd(r.totalPenalty)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {r.totalMinutesOvertime > 0 ? r.totalMinutesOvertime : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {r.totalOvertimeAmount > 0 ? (
                            <span className="font-medium text-blue-600">{fmtVnd(r.totalOvertimeAmount)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Summary row */}
                  {totals && (
                    <tfoot className="bg-gray-800 text-white">
                      <tr>
                        <td colSpan={2} className="px-3 py-3 font-semibold text-sm">Tổng cộng</td>
                        <td className="px-3 py-3 text-center font-semibold">{totals.daysPresent}</td>
                        <td className="px-3 py-3 text-center font-semibold">{totals.daysAbsent}</td>
                        <td className="px-3 py-3 text-center font-semibold">{totals.daysLate}</td>
                        <td className="px-3 py-3 text-center font-semibold">{totals.totalMinutesLate}</td>
                        <td className="px-3 py-3 text-right font-semibold">{fmtVnd(totals.totalPenalty)}</td>
                        <td className="px-3 py-3 text-center font-semibold">{totals.totalMinutesOvertime}</td>
                        <td className="px-3 py-3 text-right font-semibold">{fmtVnd(totals.totalOvertimeAmount)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state when no report generated yet */}
      {!loading && !data && !error && (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Chọn khoảng thời gian và nhấn "Tạo báo cáo"</p>
        </div>
      )}
    </div>
  );
}
