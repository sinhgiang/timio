"use client";

import { useState, useCallback, useEffect } from "react";
import { CalendarRange, Download, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month: number;
  totalEmployees: number;
  avgPresent: number;
  avgLate: number;
  totalPenalty: number;
  totalOT: number;
  totalSalary: number;
}

interface TopEntry {
  name: string;
  code: string;
  totalDaysLate: number;
}

interface TopAbsentEntry {
  name: string;
  code: string;
  totalDaysAbsent: number;
}

interface AnnualReport {
  year: number;
  months: MonthRow[];
  topLate: TopEntry[];
  topAbsent: TopAbsentEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_VI = [
  "T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12",
];

function fmtVnd(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

// ─── SVG Bar+Line Chart ───────────────────────────────────────────────────────

function AnnualChart({ months }: { months: MonthRow[] }) {
  const maxPresent = Math.max(...months.map((m) => m.avgPresent), 1);
  const maxLate = Math.max(...months.map((m) => m.avgLate), 1);

  const W = 560;
  const H = 180;
  const padL = 32;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = Math.floor(chartW / 12) - 4;

  // Y-axis lines
  const yLines = [0, 0.25, 0.5, 0.75, 1];

  // Line path for avgLate
  const linePoints = months.map((m, i) => {
    const x = padL + i * (chartW / 12) + (chartW / 12) / 2;
    const y = padT + chartH - (m.avgLate / maxLate) * chartH;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Biểu đồ tổng kết năm">
      {/* Grid lines */}
      {yLines.map((pct) => {
        const y = padT + chartH - pct * chartH;
        return (
          <g key={pct}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#E5E7EB" strokeWidth="0.8" />
            {pct > 0 && (
              <text x={padL - 4} y={y + 4} fontSize="9" fill="#9CA3AF" textAnchor="end">
                {Math.round(maxPresent * pct)}
              </text>
            )}
          </g>
        );
      })}

      {/* Bars (avgPresent) */}
      {months.map((m, i) => {
        const barH = maxPresent > 0 ? (m.avgPresent / maxPresent) * chartH : 0;
        const x = padL + i * (chartW / 12) + (chartW / 12 - barW) / 2;
        const y = padT + chartH - barH;
        return (
          <g key={m.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="3"
              fill="#3B82F6"
              opacity="0.75"
            />
            <text
              x={x + barW / 2}
              y={padT + chartH + 16}
              fontSize="9"
              fill="#6B7280"
              textAnchor="middle"
            >
              {MONTH_VI[m.month - 1]}
            </text>
          </g>
        );
      })}

      {/* Line (avgLate) */}
      {months.length > 0 && (
        <polyline
          points={linePoints.join(" ")}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}

      {/* Line dots */}
      {months.map((m, i) => {
        const x = padL + i * (chartW / 12) + (chartW / 12) / 2;
        const y = padT + chartH - (maxLate > 0 ? (m.avgLate / maxLate) * chartH : 0);
        return (
          <circle key={`dot-${m.month}`} cx={x} cy={y} r="3" fill="#F59E0B" />
        );
      })}

      {/* Legend */}
      <rect x={padL} y={4} width="10" height="8" rx="2" fill="#3B82F6" opacity="0.75" />
      <text x={padL + 13} y={11} fontSize="9" fill="#4B5563">NV có mặt TB</text>
      <line x1={padL + 85} y1={8} x2={padL + 100} y2={8} stroke="#F59E0B" strokeWidth="2" />
      <circle cx={padL + 92} cy={8} r="3" fill="#F59E0B" />
      <text x={padL + 104} y={11} fontSize="9" fill="#4B5563">NV trễ TB</text>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnnualReportClient() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<AnnualReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/annual?year=${y}`);
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Lỗi không xác định");
      }
      const json = (await res.json()) as AnnualReport;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(CURRENT_YEAR);
  }, [fetchData]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = parseInt(e.target.value, 10);
    setYear(y);
    fetchData(y);
  };

  const handleExcel = () => {
    window.location.href = `/api/reports/annual?year=${year}&format=excel`;
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <CalendarRange className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tổng kết năm</h1>
            <p className="text-sm text-gray-500">Tổng hợp chấm công và lương theo từng tháng trong năm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={handleYearChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" strokeWidth={1.5} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {/* Content */}
      {!loading && data && (
        <>
          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              Trung bình có mặt &amp; đi trễ theo tháng — năm {data.year}
            </h2>
            {data.months.some((m) => m.totalEmployees > 0) ? (
              <AnnualChart months={data.months} />
            ) : (
              <p className="text-center text-gray-400 py-8 text-sm">Chưa có dữ liệu năm này</p>
            )}
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Chi tiết theo tháng</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Tháng</th>
                    <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">NV có mặt TB</th>
                    <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">NV trễ TB</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Tổng phạt</th>
                    <th className="text-center px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Tổng OT (h)</th>
                    <th className="text-right px-3 py-3 text-gray-500 font-medium text-xs whitespace-nowrap">Tổng lương đã trả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.months.map((m) => (
                    <tr key={m.month} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">
                        Tháng {m.month}/{data.year}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.totalEmployees > 0 ? (
                          <span className="font-semibold text-green-600">{m.avgPresent}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {m.avgLate > 0 ? (
                          <span className="font-semibold text-orange-500">{m.avgLate}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {m.totalPenalty > 0 ? (
                          <span className="font-medium text-red-600">{fmtVnd(m.totalPenalty)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {m.totalOT > 0 ? m.totalOT : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {m.totalSalary > 0 ? (
                          <span className="font-medium text-blue-600">{fmtVnd(m.totalSalary)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top 5 tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 5 late */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-100 bg-orange-50">
                <h2 className="text-sm font-semibold text-orange-700">Top 5 đi trễ nhiều nhất</h2>
              </div>
              {data.topLate.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Không có dữ liệu</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">Nhân viên</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Số ngày trễ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topLate.map((e, i) => (
                      <tr key={e.code} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{e.name}</p>
                          <p className="text-xs text-gray-400">{e.code}</p>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-orange-500">{e.totalDaysLate}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top 5 absent */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                <h2 className="text-sm font-semibold text-red-700">Top 5 vắng nhiều nhất</h2>
              </div>
              {data.topAbsent.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Không có dữ liệu</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">#</th>
                      <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">Nhân viên</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Số ngày vắng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topAbsent.map((e, i) => (
                      <tr key={e.code} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-800">{e.name}</p>
                          <p className="text-xs text-gray-400">{e.code}</p>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-red-500">{e.totalDaysAbsent}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
