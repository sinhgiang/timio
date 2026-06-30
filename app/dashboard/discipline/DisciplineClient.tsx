"use client";

import { useState } from "react";
import { ShieldAlert, Plus, Trash2, Loader2, X } from "lucide-react";

type DisciplineType = "warning" | "serious_warning" | "suspension" | "dismissal";

interface DisciplineRecord {
  id: string;
  type: DisciplineType;
  date: string;
  reason: string;
  note: string | null;
  createdAt: string;
  employee: {
    id: string;
    name: string;
    code: string;
    department: string | null;
  };
}

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

interface Props {
  initialRecords: DisciplineRecord[];
  employees: Employee[];
}

const TYPE_CONFIG: Record<DisciplineType, { label: string; cls: string }> = {
  warning: {
    label: "Cảnh cáo miệng",
    cls: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  },
  serious_warning: {
    label: "Cảnh cáo văn bản",
    cls: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  suspension: {
    label: "Tạm đình chỉ",
    cls: "bg-red-100 text-red-700 border border-red-200",
  },
  dismissal: {
    label: "Sa thải",
    cls: "bg-red-200 text-red-900 border border-red-300",
  },
};

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

interface FormState {
  employeeId: string;
  date: string;
  type: DisciplineType;
  reason: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  employeeId: "",
  date: new Date().toISOString().slice(0, 10),
  type: "warning",
  reason: "",
  note: "",
};

export default function DisciplineClient({ initialRecords, employees }: Props) {
  const [records, setRecords] = useState<DisciplineRecord[]>(initialRecords);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [filterType, setFilterType] = useState<DisciplineType | "all">("all");

  const displayed = records.filter((r) => {
    const matchName =
      searchName === "" ||
      r.employee.name.toLowerCase().includes(searchName.toLowerCase()) ||
      r.employee.code.toLowerCase().includes(searchName.toLowerCase());
    const matchType = filterType === "all" || r.type === filterType;
    return matchName && matchType;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.date || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/discipline-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          type: form.type,
          date: form.date,
          reason: form.reason.trim(),
          note: form.note.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Lỗi khi tạo hồ sơ");
        return;
      }
      const created = await res.json() as DisciplineRecord;
      setRecords((prev) => [created, ...prev]);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xác nhận xóa hồ sơ kỷ luật này?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/discipline-records/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Lỗi khi xóa");
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldAlert size={20} className="text-red-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kỷ luật lao động</h1>
            <p className="text-sm text-gray-500">Quản lý hồ sơ kỷ luật nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Plus size={16} strokeWidth={1.5} />
          Thêm hồ sơ kỷ luật
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Tìm nhân viên..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white w-48"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DisciplineType | "all")}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
        >
          <option value="all">Tất cả loại</option>
          <option value="warning">Cảnh cáo miệng</option>
          <option value="serious_warning">Cảnh cáo văn bản</option>
          <option value="suspension">Tạm đình chỉ</option>
          <option value="dismissal">Sa thải</option>
        </select>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShieldAlert size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 font-medium">Không có hồ sơ kỷ luật nào</p>
          <p className="text-gray-400 text-sm mt-1">
            {searchName || filterType !== "all"
              ? "Không có dữ liệu cho bộ lọc này"
              : "Chưa có nhân viên nào bị kỷ luật"}
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Loại kỷ luật</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Lý do</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ghi chú</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.employee.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.employee.code}
                        {r.employee.department ? ` · ${r.employee.department}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {fmtDate(r.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CONFIG[r.type].cls}`}
                      >
                        {TYPE_CONFIG[r.type].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[220px]">
                      <span className="line-clamp-2">{r.reason}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                      <span className="line-clamp-2">{r.note ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Xóa hồ sơ"
                      >
                        {deleting === r.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} strokeWidth={1.5} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Hiển thị {displayed.length} / {records.length} hồ sơ
      </p>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Thêm hồ sơ kỷ luật</h2>
              <button
                onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Employee select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}){emp.department ? ` — ${emp.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ngày kỷ luật <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại kỷ luật <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DisciplineType }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <option value="warning">Cảnh cáo miệng</option>
                  <option value="serious_warning">Cảnh cáo bằng văn bản</option>
                  <option value="suspension">Tạm đình chỉ</option>
                  <option value="dismissal">Sa thải</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Mô tả lý do kỷ luật..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={2}
                  placeholder="Thông tin bổ sung..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} strokeWidth={1.5} />
                  )}
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
