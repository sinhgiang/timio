"use client";

import { useState } from "react";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type OTStatus = "pending" | "approved" | "rejected";

interface OvertimeRequest {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string | null;
  status: OTStatus;
  note: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    code: string;
    department: string | null;
  };
}

interface Props {
  initialRequests: OvertimeRequest[];
}

const STATUS_CONFIG: Record<OTStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  approved: { label: "Đã duyệt", cls: "bg-green-100 text-green-700 border border-green-200" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700 border border-red-200" },
};

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function OvertimeRequestsClient({ initialRequests }: Props) {
  const [requests, setRequests] = useState<OvertimeRequest[]>(initialRequests);
  const [filter, setFilter] = useState<OTStatus | "all">("pending");
  const [loading, setLoading] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);

  const displayed =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  async function handleDecision(
    id: string,
    status: "approved" | "rejected",
    noteOverride?: string
  ) {
    setLoading(id);
    try {
      const note = noteOverride !== undefined ? noteOverride : (noteInputs[id] ?? "");
      const res = await fetch(`/api/overtime-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Lỗi khi cập nhật");
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status, note: note || null } : r
        )
      );
      setShowNoteFor(null);
      setNoteInputs((prev) => {
        const next = { ...prev };
        delete next[id];
        delete next[`reject-${id}`];
        return next;
      });
    } finally {
      setLoading(null);
    }
  }

  const filterButtons: { key: OTStatus | "all"; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "pending", label: `Chờ duyệt${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Đã duyệt" },
    { key: "rejected", label: "Từ chối" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
          <Clock size={20} className="text-orange-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Duyệt tăng ca</h1>
          <p className="text-sm text-gray-500">Xem xét và phê duyệt yêu cầu tăng ca của nhân viên</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Clock size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 font-medium">Không có yêu cầu tăng ca nào</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === "pending"
              ? "Hiện không có yêu cầu đang chờ duyệt"
              : "Không có dữ liệu cho bộ lọc này"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhân viên</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Giờ tăng ca</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Số giờ</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Lý do</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.employee.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.employee.code}
                          {r.employee.department ? ` · ${r.employee.department}` : ""}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {fmtDate(r.date)}
                      </td>

                      {/* Time range */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {r.startTime} – {r.endTime}
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-orange-600">{r.hours}h</span>
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                        <span className="line-clamp-2">{r.reason ?? "—"}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[r.status].cls}`}
                        >
                          {STATUS_CONFIG[r.status].label}
                        </span>
                        {r.note && (
                          <p className="text-xs text-gray-400 mt-1 max-w-[120px] mx-auto truncate" title={r.note}>
                            {r.note}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() =>
                                setShowNoteFor(showNoteFor === r.id ? null : r.id)
                              }
                              disabled={loading === r.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                              title="Duyệt"
                            >
                              <CheckCircle2 size={13} strokeWidth={1.5} />
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                setShowNoteFor(showNoteFor === `reject-${r.id}` ? null : `reject-${r.id}`);
                              }}
                              disabled={loading === r.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                              title="Từ chối"
                            >
                              <XCircle size={13} strokeWidth={1.5} />
                              Từ chối
                            </button>
                            {loading === r.id && (
                              <Loader2 size={14} className="animate-spin text-gray-400" />
                            )}
                          </div>
                        )}
                        {r.status !== "pending" && (
                          <span className="text-xs text-gray-400 text-center block">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Approve note row */}
                    {showNoteFor === r.id && r.status === "pending" && (
                      <tr key={`approve-note-${r.id}`} className="bg-green-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-green-700 font-medium">Ghi chú khi duyệt (không bắt buộc):</span>
                            <input
                              type="text"
                              value={noteInputs[r.id] ?? ""}
                              onChange={(e) =>
                                setNoteInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              placeholder="Ví dụ: Tăng ca dự án ABC..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                            />
                            <button
                              onClick={() => handleDecision(r.id, "approved")}
                              disabled={loading === r.id}
                              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {loading === r.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} strokeWidth={1.5} />
                              )}
                              Xác nhận duyệt
                            </button>
                            <button
                              onClick={() => setShowNoteFor(null)}
                              className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700"
                            >
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Reject note row */}
                    {showNoteFor === `reject-${r.id}` && r.status === "pending" && (
                      <tr key={`reject-note-${r.id}`} className="bg-red-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-red-700 font-medium">Lý do từ chối (không bắt buộc):</span>
                            <input
                              type="text"
                              value={noteInputs[`reject-${r.id}`] ?? ""}
                              onChange={(e) =>
                                setNoteInputs((prev) => ({ ...prev, [`reject-${r.id}`]: e.target.value }))
                              }
                              placeholder="Ví dụ: Không đủ nhân lực phê duyệt..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                            />
                            <button
                              onClick={() => {
                                handleDecision(r.id, "rejected", noteInputs[`reject-${r.id}`] ?? "");
                              }}
                              disabled={loading === r.id}
                              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {loading === r.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <XCircle size={13} strokeWidth={1.5} />
                              )}
                              Xác nhận từ chối
                            </button>
                            <button
                              onClick={() => setShowNoteFor(null)}
                              className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700"
                            >
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Hiển thị {displayed.length} / {requests.length} yêu cầu
      </p>
    </div>
  );
}
