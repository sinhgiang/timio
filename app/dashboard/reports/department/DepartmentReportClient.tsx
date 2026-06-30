"use client";

import { useState, useCallback } from "react";

interface DeptStat {
  department: string;
  totalEmployees: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  avgLateMinutes: number;
  totalPenalty: number;
  presentRate: number;
  lateRate: number;
}

type SortKey = keyof DeptStat;
type SortDir = "asc" | "desc";

interface Props {
  initialData: DeptStat[];
  initialMonth: string; // YYYY-MM
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
}

export default function DepartmentReportClient({ initialData, initialMonth }: Props) {
  const [data, setData] = useState<DeptStat[]>(initialData);
  const [month, setMonth] = useState(initialMonth);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("department");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/department?month=${m}`);
      if (res.ok) {
        const json = (await res.json()) as DeptStat[];
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const m = e.target.value;
    setMonth(m);
    if (m) fetchData(m);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp =
      typeof av === "string"
        ? av.localeCompare(bv as string)
        : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const ThBtn = ({
    k,
    children,
  }: {
    k: SortKey;
    children: React.ReactNode;
  }) => (
    <th
      className="text-left px-3 py-3 text-gray-500 font-medium text-xs cursor-pointer hover:text-gray-800 select-none whitespace-nowrap"
      onClick={() => handleSort(k)}
    >
      {children}
      <SortIcon k={k} />
    </th>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Báo cáo theo phòng ban</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            So sánh tỉ lệ chấm công và vi phạm giữa các phòng ban
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={handleMonthChange}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <a
            href={`/api/reports/department/export?month=${month}`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            Xuất Excel
          </a>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p>Chưa có dữ liệu cho tháng này</p>
        </div>
      )}

      {/* Content */}
      {!loading && data.length > 0 && (
        <>
          {/* SVG Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              Tỉ lệ có mặt theo phòng ban (%)
            </h2>
            <svg
              viewBox={`0 0 500 ${Math.max(120, data.length * 40 + 20)}`}
              className="w-full"
            >
              {data.map((d, i) => {
                const barW = Math.max((d.presentRate / 100) * 360, 2);
                const y = i * 40 + 10;
                const barColor =
                  d.presentRate >= 80
                    ? "#4ADE80"
                    : d.presentRate >= 60
                    ? "#FCD34D"
                    : "#F87171";
                const label =
                  d.department.length > 16
                    ? d.department.slice(0, 14) + "…"
                    : d.department;
                return (
                  <g key={d.department}>
                    <text
                      x="0"
                      y={y + 19}
                      fontSize="11"
                      fill="#6B7280"
                      textAnchor="start"
                      dominantBaseline="middle"
                    >
                      {label}
                    </text>
                    <rect
                      x="120"
                      y={y + 5}
                      width={barW}
                      height="24"
                      rx="3"
                      fill={barColor}
                      opacity="0.85"
                    />
                    <text
                      x={120 + barW + 6}
                      y={y + 17}
                      fontSize="11"
                      fill="#374151"
                      dominantBaseline="middle"
                    >
                      {d.presentRate}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <ThBtn k="department">Phòng ban</ThBtn>
                    <ThBtn k="totalEmployees">Nhân viên</ThBtn>
                    <ThBtn k="presentRate">Tỉ lệ có mặt%</ThBtn>
                    <ThBtn k="lateRate">Tỉ lệ đi trễ%</ThBtn>
                    <ThBtn k="avgLateMinutes">TB trễ (phút)</ThBtn>
                    <ThBtn k="totalPenalty">Phạt (VND)</ThBtn>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((d) => (
                    <tr key={d.department} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">
                        {d.department}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {d.totalEmployees}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            d.presentRate >= 80
                              ? "text-green-600"
                              : d.presentRate >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {d.presentRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            d.lateRate === 0
                              ? "text-gray-400"
                              : d.lateRate <= 20
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {d.lateRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600">
                        {d.avgLateMinutes > 0 ? `${d.avgLateMinutes} phút` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-red-600">
                        {d.totalPenalty > 0 ? formatCurrency(d.totalPenalty) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
