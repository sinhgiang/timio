"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, ChevronDown, Filter } from "lucide-react";

interface Correction {
  id: string;
  date: string;
  type: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  employee: { name: string; code: string; department: string | null };
}

const TYPE_LABEL: Record<string, string> = {
  check_in: "Quên chấm vào",
  check_out: "Quên chấm ra",
  both: "Quên vào & ra",
};

const STATUS = {
  pending: { label: "Chờ duyệt", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Đã duyệt", cls: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700 border-red-200" },
};

export default function CorrectionsClient({ initialData }: { initialData: Correction[] }) {
  const [items, setItems] = useState<Correction[]>(initialData);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const displayed = filter === "all" ? items : items.filter((i) => i.status === filter);
  const pendingCount = items.filter((i) => i.status === "pending").length;

  async function handleDecision(id: string, status: "approved" | "rejected", adminNote?: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/attendance/correction/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: adminNote ?? null }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status, adminNote: adminNote ?? null } : i)));
        setActionId(null);
        setRejectTarget(null);
        setRejectNote("");
      }
    } finally {
      setLoading(null);
    }
  }

  function fmtDate(d: string) {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Điều chỉnh chấm công</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nhân viên gửi yêu cầu khi quên chấm công. Xem xét và phê duyệt tại đây.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Chờ duyệt" value={pendingCount} color="yellow" />
        <StatCard label="Đã duyệt" value={items.filter((i) => i.status === "approved").length} color="green" />
        <StatCard label="Từ chối" value={items.filter((i) => i.status === "rejected").length} color="red" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["pending", "all", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "Tất cả" : f === "pending" ? "Chờ duyệt" : f === "approved" ? "Đã duyệt" : "Từ chối"}
            {f === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Không có yêu cầu nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nhân viên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Loại</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Đề nghị</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((item) => {
                const s = STATUS[item.status as keyof typeof STATUS] ?? STATUS.pending;
                const isExpanded = actionId === item.id;

                return (
                  <>
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-sm">{item.employee.name}</p>
                        <p className="text-xs text-gray-400">{item.employee.code} · {item.employee.department ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(item.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{TYPE_LABEL[item.type] ?? item.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.requestedCheckIn && <span className="block">Vào: <b>{item.requestedCheckIn}</b></span>}
                        {item.requestedCheckOut && <span className="block">Ra: <b>{item.requestedCheckOut}</b></span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${s.cls}`}>{s.label}</span>
                        {item.adminNote && (
                          <p className="text-xs text-gray-400 mt-1 max-w-[140px] truncate">{item.adminNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDecision(item.id, "approved")}
                              disabled={loading === item.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                            >
                              <CheckCircle2 size={12} /> Duyệt
                            </button>
                            <button
                              onClick={() => { setRejectTarget(item.id); setActionId(item.id); }}
                              disabled={loading === item.id}
                              className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors font-medium"
                            >
                              <XCircle size={12} /> Từ chối
                            </button>
                            <button
                              onClick={() => setActionId(isExpanded ? null : item.id)}
                              className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50"
                            >
                              <ChevronDown size={14} className={isExpanded && rejectTarget !== item.id ? "rotate-180 transition-transform" : "transition-transform"} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActionId(isExpanded ? null : item.id)}
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            Chi tiết <ChevronDown size={12} className={isExpanded ? "rotate-180" : ""} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Expanded detail / reject form */}
                    {isExpanded && (
                      <tr key={`${item.id}-detail`}>
                        <td colSpan={6} className="px-4 pb-4 bg-gray-50">
                          {rejectTarget === item.id ? (
                            <div className="pt-3 flex items-end gap-3">
                              <div className="flex-1">
                                <label className="text-xs font-semibold text-gray-600 block mb-1">Lý do từ chối (optional)</label>
                                <input
                                  type="text"
                                  value={rejectNote}
                                  onChange={e => setRejectNote(e.target.value)}
                                  placeholder="Nhập ghi chú cho nhân viên..."
                                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                                />
                              </div>
                              <button
                                onClick={() => handleDecision(item.id, "rejected", rejectNote || undefined)}
                                disabled={loading === item.id}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                              >
                                {loading === item.id ? "..." : "Xác nhận từ chối"}
                              </button>
                              <button onClick={() => { setRejectTarget(null); setActionId(null); }} className="text-xs text-gray-400 hover:text-gray-600">Hủy</button>
                            </div>
                          ) : (
                            <div className="pt-3 text-sm text-gray-600 space-y-1">
                              <p><span className="font-medium text-gray-700">Lý do xin điều chỉnh:</span> {item.reason}</p>
                              {item.adminNote && <p><span className="font-medium text-gray-700">Ghi chú HR:</span> {item.adminNote}</p>}
                              <p className="text-xs text-gray-400">Gửi lúc: {new Date(item.createdAt).toLocaleString("vi-VN")}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700",
    green: "bg-green-50 border-green-100 text-green-700",
    red: "bg-red-50 border-red-100 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
