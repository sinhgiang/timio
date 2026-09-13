"use client";

import { useState, useCallback } from "react";
import { Building2, Users2, TrendingUp, AlertTriangle, Banknote, Download, CalendarDays } from "lucide-react";

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

// Ngưỡng màu dùng chung cho cả thanh tiến trình lẫn badge % trong bảng — 1 chỗ để đổi, tránh
// lệch màu giữa 2 nơi (trước đây SVG chart và bảng mỗi bên tự định nghĩa ngưỡng riêng).
function presentColor(rate: number): { bar: string; text: string; bg: string } {
  if (rate >= 80) return { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50" };
  if (rate >= 60) return { bar: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" };
  return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" };
}

function lateColor(rate: number): { text: string; bg: string } {
  if (rate === 0) return { text: "text-gray-400", bg: "bg-gray-50" };
  if (rate <= 20) return { text: "text-yellow-700", bg: "bg-yellow-50" };
  return { text: "text-red-700", bg: "bg-red-50" };
}

// Card số liệu tổng quan đầu trang — cùng phong cách MiniStat đã dùng ở Tổng quan (dashboard/page.tsx)
// để nhất quán trong toàn app, thay vì mỗi trang báo cáo tự bịa 1 kiểu card khác nhau.
function StatCard({
  label, value, sub, Icon, tone,
}: { label: string; value: string; sub: string; Icon: typeof Building2; tone: "blue" | "green" | "amber" | "red" }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  } as const;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${toneMap[tone]}`}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="text-xl font-extrabold text-gray-900 leading-none truncate">{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-1.5">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</div>
    </div>
  );
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

  // Sắp theo tỉ lệ có mặt (cao → thấp) riêng cho phần thanh tiến trình — dễ nhìn ra ngay phòng
  // ban nào đang kém nhất mà không phải đụng vào sắp xếp của bảng bên dưới.
  const byPresentRate = [...data].sort((a, b) => b.presentRate - a.presentRate);

  const avgPresentRate = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.presentRate, 0) / data.length) : 0;
  const totalPenalty = data.reduce((s, d) => s + d.totalPenalty, 0);
  const worstLate = data.length > 0 ? data.reduce((w, d) => (d.lateRate > w.lateRate ? d : w), data[0]) : null;

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-gray-500">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const ThBtn = ({ k, children, align = "left" }: { k: SortKey; children: React.ReactNode; align?: "left" | "center" | "right" }) => (
    <th
      className={`px-3 py-3 text-gray-500 font-semibold text-xs uppercase tracking-wide cursor-pointer hover:text-gray-800 select-none whitespace-nowrap text-${align}`}
      onClick={() => handleSort(k)}
    >
      {children}
      <SortIcon k={k} />
    </th>
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-indigo-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Báo cáo theo phòng ban</h1>
            <p className="text-sm text-gray-500 mt-0.5">So sánh tỉ lệ chấm công và vi phạm giữa các phòng ban</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="month"
              value={month}
              onChange={handleMonthChange}
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <a
            href={`/api/reports/department/export?month=${month}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <Download size={15} strokeWidth={2} /> Xuất Excel
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
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p>Chưa có dữ liệu cho tháng này</p>
        </div>
      )}

      {/* Content */}
      {!loading && data.length > 0 && (
        <>
          {/* Card số liệu tổng quan — nhìn 1 giây là nắm được bức tranh chung, khỏi phải đọc hết bảng */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Phòng ban"
              value={String(data.length)}
              sub={`${data.reduce((s, d) => s + d.totalEmployees, 0)} nhân viên`}
              Icon={Users2}
              tone="blue"
            />
            <StatCard
              label="Tỉ lệ có mặt TB"
              value={`${avgPresentRate}%`}
              sub="trung bình các phòng ban"
              Icon={TrendingUp}
              tone="green"
            />
            <StatCard
              label="Đi trễ nhiều nhất"
              value={worstLate && worstLate.lateRate > 0 ? `${worstLate.lateRate}%` : "—"}
              sub={worstLate && worstLate.lateRate > 0 ? worstLate.department : "Không phòng ban nào trễ"}
              Icon={AlertTriangle}
              tone="amber"
            />
            <StatCard
              label="Tổng tiền phạt"
              value={totalPenalty > 0 ? formatCurrency(totalPenalty) : "0 ₫"}
              sub="cộng dồn tất cả phòng ban"
              Icon={Banknote}
              tone="red"
            />
          </div>

          {/* Thanh tiến trình tỉ lệ có mặt — thay cho SVG chart cũ (bị vỡ chữ/số khi phòng ban đạt
              100%, do viewBox cố định 500 không đủ chỗ cho nhãn "100%"). Dùng div/flex thường,
              co giãn tự nhiên theo mọi kích thước màn hình, không bao giờ bị cắt chữ. */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Tỉ lệ có mặt theo phòng ban</h2>
            <div className="space-y-4">
              {byPresentRate.map((d) => {
                const c = presentColor(d.presentRate);
                return (
                  <div key={d.department}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                          {d.department.charAt(0)}
                        </span>
                        <span className="text-gray-700 font-medium truncate">{d.department}</span>
                        <span className="text-gray-400 shrink-0">· {d.totalEmployees} NV</span>
                      </div>
                      <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{d.presentRate}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.max(d.presentRate, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bảng chi tiết — desktop */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <ThBtn k="department">Phòng ban</ThBtn>
                    <ThBtn k="totalEmployees" align="center">Nhân viên</ThBtn>
                    <ThBtn k="presentRate" align="center">Tỉ lệ có mặt</ThBtn>
                    <ThBtn k="lateRate" align="center">Tỉ lệ đi trễ</ThBtn>
                    <ThBtn k="avgLateMinutes" align="center">TB trễ</ThBtn>
                    <ThBtn k="totalPenalty" align="right">Phạt</ThBtn>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((d) => {
                    const pc = presentColor(d.presentRate);
                    const lc = lateColor(d.lateRate);
                    return (
                      <tr key={d.department} className="hover:bg-gray-50/70">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                              {d.department.charAt(0)}
                            </span>
                            <span className="font-medium text-gray-800">{d.department}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">{d.totalEmployees}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pc.bg} ${pc.text}`}>{d.presentRate}%</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${lc.bg} ${lc.text}`}>{d.lateRate}%</span>
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {d.avgLateMinutes > 0 ? `${d.avgLateMinutes} phút` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-red-600">
                          {d.totalPenalty > 0 ? formatCurrency(d.totalPenalty) : <span className="text-gray-300 font-normal">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bảng chi tiết — mobile: đổi sang card thay vì kéo ngang bảng (khó dùng trên điện
              thoại), cùng kiểu card đã dùng cho bảng "Chuyên cần hôm nay" ở Tổng quan. */}
          <div className="md:hidden space-y-2.5">
            {sorted.map((d) => {
              const pc = presentColor(d.presentRate);
              const lc = lateColor(d.lateRate);
              return (
                <div key={d.department} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                      {d.department.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{d.department}</p>
                      <p className="text-xs text-gray-400">{d.totalEmployees} nhân viên</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                      <p className="text-gray-400 mb-0.5">Có mặt</p>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${pc.bg} ${pc.text}`}>{d.presentRate}%</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                      <p className="text-gray-400 mb-0.5">Đi trễ</p>
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${lc.bg} ${lc.text}`}>{d.lateRate}%</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                      <p className="text-gray-400 mb-0.5">TB trễ</p>
                      <p className="font-semibold text-gray-700">{d.avgLateMinutes > 0 ? `${d.avgLateMinutes} phút` : "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                      <p className="text-gray-400 mb-0.5">Phạt</p>
                      <p className="font-semibold text-red-600">{d.totalPenalty > 0 ? formatCurrency(d.totalPenalty) : "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
