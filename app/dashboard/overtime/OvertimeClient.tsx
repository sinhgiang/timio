"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Timer, AlertTriangle } from "lucide-react";

interface OvertimeLog {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  minutesOvertime: number;
  overtimeAmount: number;
  overtimeStatus: string;
  employee: {
    id: string;
    name: string;
    code: string;
    department: string | null;
    branch: { name: string };
  };
}

type Tab = "pending" | "approved" | "rejected";

function fmtDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}
function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function fmtVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}
function hoursFromMinutes(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}g${min > 0 ? min + "p" : ""}` : `${min}p`;
}

export default function OvertimeClient({ logs: initialLogs }: { logs: OvertimeLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const pending  = logs.filter((l) => l.overtimeStatus === "pending");
  const approved = logs.filter((l) => l.overtimeStatus === "approved");
  const rejected = logs.filter((l) => l.overtimeStatus === "rejected");

  const tabLogs = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  const totalApprovedAmount = approved.reduce((s, l) => s + l.overtimeAmount, 0);
  const totalPendingAmount  = pending.reduce((s, l) => s + l.overtimeAmount, 0);

  const handleAction = async (logId: string, action: "approve" | "reject") => {
    setLoading((p) => ({ ...p, [logId]: true }));
    try {
      const res = await fetch(`/api/overtime/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId ? { ...l, overtimeStatus: data.status, overtimeAmount: data.overtimeAmount } : l
          )
        );
      }
    } finally {
      setLoading((p) => ({ ...p, [logId]: false }));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Duyệt tăng ca</h1>
        <p className="text-sm text-gray-500 mt-0.5">Phê duyệt giờ làm thêm — chỉ khi duyệt mới tính vào phiếu lương</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium mb-1">Chờ duyệt</p>
          <p className="text-2xl font-bold text-orange-700">{pending.length}</p>
          {totalPendingAmount > 0 && <p className="text-xs text-orange-500 mt-0.5">{fmtVND(totalPendingAmount)}</p>}
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Đã duyệt</p>
          <p className="text-2xl font-bold text-green-700">{approved.length}</p>
          {totalApprovedAmount > 0 && <p className="text-xs text-green-500 mt-0.5">{fmtVND(totalApprovedAmount)}</p>}
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Từ chối</p>
          <p className="text-2xl font-bold text-gray-600">{rejected.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {([
          ["pending", "Chờ duyệt", pending.length, "bg-orange-100 text-orange-700"],
          ["approved", "Đã duyệt", approved.length, "bg-green-100 text-green-700"],
          ["rejected", "Từ chối", rejected.length, "bg-gray-200 text-gray-600"],
        ] as const).map(([key, label, count, badgeCls]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${badgeCls}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {tabLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Clock size={32} className="text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-400 text-sm">Không có bản ghi tăng ca {tab === "pending" ? "chờ duyệt" : tab === "approved" ? "đã duyệt" : "bị từ chối"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {tabLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Timer size={18} className="text-orange-500" strokeWidth={1.5} />
                </div>

                {/* Employee + date */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">{log.employee.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{log.employee.code}</span>
                    {log.employee.department && (
                      <span className="text-xs text-gray-400">· {log.employee.department}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                    <span>{fmtDate(log.date)}</span>
                    <span className="text-gray-300">·</span>
                    <span>{fmtTime(log.checkInAt)} → {fmtTime(log.checkOutAt)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-medium text-orange-600">{hoursFromMinutes(log.minutesOvertime)} tăng ca</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-400">{log.employee.branch.name}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0 min-w-[80px]">
                  {log.overtimeAmount > 0 ? (
                    <p className="font-bold text-gray-900 text-sm">+{fmtVND(log.overtimeAmount)}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Chưa tính</p>
                  )}
                </div>

                {/* Actions / Badge */}
                {tab === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(log.id, "approve")}
                      disabled={loading[log.id]}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium border border-green-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} strokeWidth={2} /> Duyệt
                    </button>
                    <button
                      onClick={() => handleAction(log.id, "reject")}
                      disabled={loading[log.id]}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium border border-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} strokeWidth={2} /> Từ chối
                    </button>
                  </div>
                )}
                {tab === "approved" && (
                  <span className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-full font-medium border border-green-100">
                    <CheckCircle2 size={11} strokeWidth={2} /> Đã duyệt
                  </span>
                )}
                {tab === "rejected" && (
                  <span className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 text-red-500 rounded-full font-medium border border-red-100">
                    <AlertTriangle size={11} strokeWidth={2} /> Từ chối
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pending" && pending.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Chỉ khi duyệt, tiền tăng ca mới được cộng vào Phiếu lương tháng của nhân viên.
        </p>
      )}
    </div>
  );
}
