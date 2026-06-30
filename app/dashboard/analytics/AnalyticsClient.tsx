"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Users, Clock, AlertTriangle, Calendar } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

interface Summary {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalOvertimeHours: number;
}

interface LateByWeek {
  week: string;
  count: number;
}

interface LateByMonth {
  month: string;
  count: number;
}

interface TopLateEmployee {
  name: string;
  code: string;
  count: number;
  totalMinutes: number;
}

interface AnalyticsData {
  summary: Summary;
  lateByWeek: LateByWeek[];
  lateByMonth: LateByMonth[];
  topLateEmployees: TopLateEmployee[];
}

interface Props {
  employees: Employee[];
}

function getLast30Days() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// Simple SVG bar chart (vertical)
function BarChart({ data, xKey, yKey, color = "#3b82f6", label }: {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  color?: string;
  label: string;
}) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Không có dữ liệu</div>
  );

  const values = data.map((d) => Number(d[yKey]));
  const maxVal = Math.max(...values, 1);
  const chartH = 120;
  const barW = Math.max(20, Math.min(40, Math.floor(400 / data.length) - 6));
  const totalW = data.length * (barW + 6);

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(totalW + 40, 300)} height={chartH + 50} aria-label={label}>
        {data.map((d, i) => {
          const val = Number(d[yKey]);
          const barH = maxVal > 0 ? (val / maxVal) * chartH : 0;
          const x = 20 + i * (barW + 6);
          const y = chartH - barH;
          const xLabel = String(d[xKey]).slice(-5); // last 5 chars e.g. "W01" or "01"
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
              {val > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize={10} fill="#374151">
                  {val}
                </text>
              )}
              <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
                {xLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Simple SVG line chart
function LineChart({ data, xKey, yKey, color = "#6366f1", label }: {
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  color?: string;
  label: string;
}) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Không có dữ liệu</div>
  );

  const values = data.map((d) => Number(d[yKey]));
  const maxVal = Math.max(...values, 1);
  const chartH = 120;
  const chartW = 400;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const points = data.map((d, i) => {
    const val = Number(d[yKey]);
    const px = 20 + i * stepX;
    const py = chartH - (val / maxVal) * chartH;
    return { px, py, val, label: String(d[xKey]).slice(-7) };
  });

  const polyline = points.map((p) => `${p.px},${p.py}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(chartW + 40, 300)} height={chartH + 50} aria-label={label}>
        <polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.px} cy={p.py} r={4} fill={color} />
            {p.val > 0 && (
              <text x={p.px} y={p.py - 8} textAnchor="middle" fontSize={10} fill="#374151">
                {p.val}
              </text>
            )}
            <text x={p.px} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#6b7280">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Horizontal bar chart for top employees
function HorizontalBarChart({ data, label }: { data: TopLateEmployee[]; label: string }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Không có dữ liệu</div>
  );

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2" aria-label={label}>
      {data.map((emp, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-32 text-xs text-gray-600 truncate text-right">{emp.name}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-5 rounded-full bg-orange-400 flex items-center justify-end pr-2 transition-all"
              style={{ width: `${(emp.count / maxCount) * 100}%` }}
            >
              <span className="text-[10px] text-white font-bold">{emp.count}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 w-20">{Math.round(emp.totalMinutes / 60 * 10) / 10}h trễ</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsClient({ employees }: Props) {
  const defaults = getLast30Days();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Extract unique departments
  const departments = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean) as string[])
  ).sort();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (selectedEmployee) params.set("employeeId", selectedEmployee);
      if (selectedDepartment) params.set("department", selectedDepartment);
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) throw new Error("Lỗi tải dữ liệu");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Không thể tải dữ liệu phân tích");
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedEmployee, selectedDepartment]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={22} className="text-blue-600" strokeWidth={1.5} />
        <h1 className="text-2xl font-bold text-gray-800">Phân tích xu hướng</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nhân viên</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tất cả nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phòng ban</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-xs text-gray-500 font-medium">Tổng ngày công</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {loading ? "—" : summary?.totalPresent ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-orange-500" strokeWidth={1.5} />
            <span className="text-xs text-gray-500 font-medium">Tổng đi muộn</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {loading ? "—" : summary?.totalLate ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">lượt</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" strokeWidth={1.5} />
            <span className="text-xs text-gray-500 font-medium">Nghỉ không phép</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {loading ? "—" : summary?.totalAbsent ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">ngày</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-500" strokeWidth={1.5} />
            <span className="text-xs text-gray-500 font-medium">Tổng tăng ca</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {loading ? "—" : summary?.totalOvertimeHours ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">giờ</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Biểu đồ đi muộn theo tuần */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-orange-500" strokeWidth={1.5} />
            Đi muộn theo tuần
          </h2>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
          ) : (
            <BarChart
              data={(data?.lateByWeek ?? []) as unknown as Record<string, number | string>[]}
              xKey="week"
              yKey="count"
              color="#f97316"
              label="Biểu đồ đi muộn theo tuần"
            />
          )}
        </div>

        {/* Xu hướng đi muộn theo tháng */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" strokeWidth={1.5} />
            Xu hướng theo tháng
          </h2>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
          ) : (
            <LineChart
              data={(data?.lateByMonth ?? []) as unknown as Record<string, number | string>[]}
              xKey="month"
              yKey="count"
              color="#6366f1"
              label="Xu hướng đi muộn theo tháng"
            />
          )}
        </div>
      </div>

      {/* Top 5 nhân viên đi muộn nhiều nhất */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Users size={15} className="text-red-500" strokeWidth={1.5} />
          Top 5 nhân viên đi muộn nhiều nhất
        </h2>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
        ) : (
          <HorizontalBarChart
            data={data?.topLateEmployees ?? []}
            label="Top 5 nhân viên đi muộn"
          />
        )}
        {!loading && !data?.topLateEmployees?.length && (
          <p className="text-sm text-gray-400 text-center py-4">Không có dữ liệu đi muộn trong khoảng thời gian này</p>
        )}
      </div>
    </div>
  );
}
