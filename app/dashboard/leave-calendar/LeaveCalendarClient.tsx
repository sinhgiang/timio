"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "other";

interface LeaveItem {
  id: string;
  employeeName: string;
  department: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  status: "pending" | "approved";
}

const TYPE_COLORS: Record<LeaveType, { bg: string; text: string; dot: string }> = {
  annual:   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500" },
  sick:     { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
  unpaid:   { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400" },
  maternity:{ bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500" },
  other:    { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
};

const TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Phép năm", sick: "Nghỉ ốm", unpaid: "Không lương",
  maternity: "Thai sản", other: "Khác",
};

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function datesBetween(from: string, to: string): string[] {
  const result: string[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    result.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

interface Props {
  initialLeaves: LeaveItem[];
  initialYear: number;
  initialMonth: number;
  companyId: string;
}

export default function LeaveCalendarClient({ initialLeaves, initialYear, initialMonth, companyId }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | LeaveType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved">("all");

  const fetchLeaves = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const fromDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const toDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const res = await fetch(
      `/api/leave-requests?companyId=${companyId}&fromDate=${fromDate}&toDate=${toDate}&status=all`
    );
    if (res.ok) {
      const data = await res.json();
      setLeaves((data.leaveRequests ?? data) as LeaveItem[]);
    }
    setLoading(false);
  }, [companyId]);

  const prevMonth = () => {
    const newM = month === 1 ? 12 : month - 1;
    const newY = month === 1 ? year - 1 : year;
    setMonth(newM); setYear(newY);
    fetchLeaves(newY, newM);
  };

  const nextMonth = () => {
    const newM = month === 12 ? 1 : month + 1;
    const newY = month === 12 ? year + 1 : year;
    setMonth(newM); setYear(newY);
    fetchLeaves(newY, newM);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  // Shift to Mon=0 index
  const startOffset = (firstDay + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  // Map date → leaves
  const leaveByDate: Record<string, LeaveItem[]> = {};
  const filteredLeaves = leaves.filter((l) => {
    if (filterType !== "all" && l.type !== filterType) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  for (const leave of filteredLeaves) {
    for (const d of datesBetween(leave.fromDate, leave.toDate)) {
      if (!leaveByDate[d]) leaveByDate[d] = [];
      leaveByDate[d].push(leave);
    }
  }

  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells[startOffset + i] = i + 1;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch nghỉ phép nhóm</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xem tất cả nghỉ phép của nhân viên trong tháng</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="text-base font-semibold text-gray-900 min-w-[120px] text-center">
            Tháng {month}/{year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "approved")}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="approved">Đã duyệt</option>
          <option value="pending">Chờ duyệt</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as "all" | LeaveType)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả loại phép</option>
          {(Object.keys(TYPE_LABELS) as LeaveType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Legend */}
        <div className="flex items-center gap-3 ml-2">
          {(Object.entries(TYPE_LABELS) as [LeaveType, string][]).map(([t, label]) => (
            <div key={t} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[t].dot}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Đang tải...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return (
                <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />
              );
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayLeaves = leaveByDate[dateStr] ?? [];
              const isToday = dateStr === today;
              const col = idx % 7;
              const isWeekend = col >= 5;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 ${isWeekend ? "bg-gray-50/30" : ""}`}
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${
                    isToday ? "bg-blue-600 text-white" : isWeekend ? "text-gray-400" : "text-gray-700"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayLeaves.slice(0, 3).map((l) => {
                      const c = TYPE_COLORS[l.type];
                      return (
                        <div
                          key={l.id + dateStr}
                          title={`${l.employeeName} — ${TYPE_LABELS[l.type]}${l.status === "pending" ? " (chờ duyệt)" : ""}`}
                          className={`rounded px-1 py-0.5 text-[10px] font-medium truncate ${c.bg} ${c.text} ${l.status === "pending" ? "opacity-60" : ""}`}
                        >
                          {l.employeeName.split(" ").pop()}
                        </div>
                      );
                    })}
                    {dayLeaves.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">+{dayLeaves.length - 3} khác</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Employee list below calendar */}
      {filteredLeaves.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-700">Danh sách nghỉ phép tháng {month}/{year}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {filteredLeaves.map((l) => {
              const c = TYPE_COLORS[l.type];
              return (
                <div key={l.id} className="flex items-center px-5 py-3 gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{l.employeeName}</p>
                    {l.department && <p className="text-xs text-gray-400">{l.department}</p>}
                  </div>
                  <div className="text-right text-xs text-gray-500 shrink-0">
                    <p>{l.fromDate.split("-").reverse().join("/")} – {l.toDate.split("-").reverse().join("/")}</p>
                    <p className="font-medium">{l.days} ngày · {TYPE_LABELS[l.type]}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    l.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {l.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredLeaves.length === 0 && !loading && (
        <div className="text-center py-16">
          <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Không có nghỉ phép nào trong tháng này</p>
        </div>
      )}
    </div>
  );
}
