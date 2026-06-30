"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type SwapStatus = "pending" | "approved" | "rejected";

interface EmployeeSummary {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

interface ShiftSwapRequest {
  id: string;
  requesterDate: string;
  targetDate: string;
  reason: string | null;
  status: SwapStatus;
  note: string | null;
  createdAt: string;
  requester: EmployeeSummary;
  target: EmployeeSummary;
}

interface Props {
  employees: EmployeeSummary[];
}

const STATUS_CONFIG: Record<SwapStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
  approved: { label: "Đã duyệt", cls: "bg-green-100 text-green-700 border border-green-200" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700 border border-red-200" },
};

const TABS: { key: SwapStatus | "all"; label: string }[] = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
];

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateTime(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ShiftSwapClient({ employees }: Props) {
  const [tab, setTab] = useState<SwapStatus>("pending");
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    requesterId: "",
    requesterDate: "",
    targetId: "",
    targetDate: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRequests = useCallback(async (status: SwapStatus) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/shift-swap-requests?status=${status}`);
      if (!res.ok) return;
      const data = await res.json() as ShiftSwapRequest[];
      setRequests(data);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void fetchRequests(tab);
  }, [tab, fetchRequests]);

  async function handleDecision(id: string, status: "approved" | "rejected", noteOverride?: string) {
    setLoading(id);
    try {
      const note = noteOverride !== undefined ? noteOverride : (noteInputs[id] ?? "");
      const res = await fetch(`/api/shift-swap-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || null }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        alert(data.error ?? "Lỗi khi cập nhật");
        return;
      }
      setShowNoteFor(null);
      setNoteInputs((prev) => {
        const next = { ...prev };
        delete next[id];
        delete next[`reject-${id}`];
        return next;
      });
      await fetchRequests(tab);
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xác nhận xóa yêu cầu đổi ca này?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/shift-swap-requests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        alert(data.error ?? "Lỗi khi xóa");
        return;
      }
      await fetchRequests(tab);
    } finally {
      setDeleting(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.requesterId || !form.targetId || !form.requesterDate || !form.targetDate) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }
    if (form.requesterId === form.targetId) {
      setFormError("Người xin đổi và người đổi với không thể là cùng một người.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shift-swap-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterId: form.requesterId,
          targetId: form.targetId,
          requesterDate: form.requesterDate,
          targetDate: form.targetDate,
          reason: form.reason || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setFormError(data.error ?? "Lỗi khi tạo yêu cầu");
        return;
      }
      setShowModal(false);
      setForm({ requesterId: "", requesterDate: "", targetId: "", targetDate: "", reason: "" });
      // Switch to pending tab and refresh
      setTab("pending");
      await fetchRequests("pending");
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = tab === "pending" ? requests.length : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ArrowLeftRight size={20} className="text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Đổi ca cho nhau</h1>
            <p className="text-sm text-gray-500">Xem xét và phê duyệt yêu cầu đổi ca giữa nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} strokeWidth={2} />
          Tạo yêu cầu đổi ca
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as SwapStatus)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
            {key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {/* Table */}
      {fetching ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Loader2 size={32} className="animate-spin text-blue-400 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Đang tải...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowLeftRight size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 font-medium">Không có yêu cầu đổi ca nào</p>
          <p className="text-gray-400 text-sm mt-1">
            {tab === "pending"
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Người xin đổi</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ca ngày</th>
                  <th className="text-center px-2 py-3 font-semibold text-gray-400">↔</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Người đổi với</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ca ngày</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Lý do</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày tạo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      {/* Requester */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.requester.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.requester.code}
                          {r.requester.department ? ` · ${r.requester.department}` : ""}
                        </p>
                      </td>

                      {/* Requester date */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {fmtDate(r.requesterDate)}
                      </td>

                      {/* Arrow */}
                      <td className="px-2 py-3 text-center">
                        <ArrowLeftRight size={14} className="text-gray-400 mx-auto" strokeWidth={1.5} />
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.target.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.target.code}
                          {r.target.department ? ` · ${r.target.department}` : ""}
                        </p>
                      </td>

                      {/* Target date */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {fmtDate(r.targetDate)}
                      </td>

                      {/* Reason */}
                      <td className="px-4 py-3 text-gray-600 max-w-[160px]">
                        <span className="line-clamp-2">{r.reason ?? "—"}</span>
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {fmtDateTime(r.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[r.status].cls}`}>
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
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setShowNoteFor(showNoteFor === r.id ? null : r.id)}
                              disabled={loading === r.id}
                              title="Duyệt"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} strokeWidth={1.5} />
                              Duyệt
                            </button>
                            <button
                              onClick={() => setShowNoteFor(showNoteFor === `reject-${r.id}` ? null : `reject-${r.id}`)}
                              disabled={loading === r.id}
                              title="Từ chối"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={13} strokeWidth={1.5} />
                              Từ chối
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deleting === r.id}
                              title="Xóa yêu cầu"
                              className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              {deleting === r.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} strokeWidth={1.5} />
                              )}
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
                        <td colSpan={9} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-green-700 font-medium">Ghi chú khi duyệt (không bắt buộc):</span>
                            <input
                              type="text"
                              value={noteInputs[r.id] ?? ""}
                              onChange={(e) => setNoteInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="Ví dụ: Đồng ý đổi ca, các bên đã thống nhất..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
                            />
                            <button
                              onClick={() => handleDecision(r.id, "approved")}
                              disabled={loading === r.id}
                              className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {loading === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} strokeWidth={1.5} />}
                              Xác nhận duyệt
                            </button>
                            <button onClick={() => setShowNoteFor(null)} className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700">
                              Hủy
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Reject note row */}
                    {showNoteFor === `reject-${r.id}` && r.status === "pending" && (
                      <tr key={`reject-note-${r.id}`} className="bg-red-50">
                        <td colSpan={9} className="px-4 py-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-red-700 font-medium">Lý do từ chối (không bắt buộc):</span>
                            <input
                              type="text"
                              value={noteInputs[`reject-${r.id}`] ?? ""}
                              onChange={(e) => setNoteInputs((prev) => ({ ...prev, [`reject-${r.id}`]: e.target.value }))}
                              placeholder="Ví dụ: Không đủ nhân lực trong ca đó..."
                              className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                            />
                            <button
                              onClick={() => handleDecision(r.id, "rejected", noteInputs[`reject-${r.id}`] ?? "")}
                              disabled={loading === r.id}
                              className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {loading === r.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} strokeWidth={1.5} />}
                              Xác nhận từ chối
                            </button>
                            <button onClick={() => setShowNoteFor(null)} className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700">
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

      <p className="text-xs text-gray-400 mt-4">Hiển thị {requests.length} yêu cầu</p>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ArrowLeftRight size={18} className="text-blue-600" strokeWidth={1.5} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Tạo yêu cầu đổi ca</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Requester */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Người xin đổi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.requesterId}
                    onChange={(e) => setForm((prev) => ({ ...prev, requesterId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ngày ca của người đó <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.requesterDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, requesterDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    required
                  />
                </div>
              </div>

              {/* Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Người đổi với <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.targetId}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    required
                  >
                    <option value="">-- Chọn nhân viên --</option>
                    {employees
                      .filter((emp) => emp.id !== form.requesterId)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ngày ca muốn đổi sang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.targetDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, targetDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ví dụ: Có việc gia đình, muốn đổi ca sáng sang chiều..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Tạo yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
