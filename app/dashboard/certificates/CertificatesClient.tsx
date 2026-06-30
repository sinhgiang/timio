"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, X, Trash2, AlertTriangle, Clock, CheckCircle, Infinity } from "lucide-react";

interface Certificate {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  note: string | null;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  code: string | null;
}

interface Props {
  certificates: Certificate[];
  employees: Employee[];
}

type StatusFilter = "all" | "valid" | "expiring" | "expired" | "noexpiry";

function getCertStatus(expiryDate: string | null): {
  label: string;
  color: string;
  bg: string;
  type: "valid" | "expiring" | "expired" | "noexpiry";
  daysLeft?: number;
} {
  if (!expiryDate) {
    return { label: "Không TH", color: "text-gray-500", bg: "bg-gray-100", type: "noexpiry" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Đã hết hạn", color: "text-red-600", bg: "bg-red-50", type: "expired", daysLeft: diffDays };
  }
  if (diffDays <= 30) {
    return { label: `Sắp hết (${diffDays}d)`, color: "text-orange-600", bg: "bg-orange-50", type: "expiring", daysLeft: diffDays };
  }
  return { label: "Còn hạn", color: "text-green-600", bg: "bg-green-50", type: "valid", daysLeft: diffDays };
}

const emptyForm = {
  employeeId: "",
  name: "",
  issuer: "",
  issueDate: "",
  expiryDate: "",
  note: "",
};

export default function CertificatesClient({ certificates, employees }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  // Summary counts
  const summary = useMemo(() => {
    let total = 0;
    let expiring = 0;
    let expired = 0;
    for (const c of certificates) {
      total++;
      const st = getCertStatus(c.expiryDate);
      if (st.type === "expiring") expiring++;
      if (st.type === "expired") expired++;
    }
    return { total, expiring, expired };
  }, [certificates]);

  // Filtered list
  const filtered = useMemo(() => {
    return certificates.filter((c) => {
      if (filterEmployee !== "all" && c.employeeId !== filterEmployee) return false;
      if (filterStatus !== "all") {
        const st = getCertStatus(c.expiryDate);
        if (st.type !== filterStatus) return false;
      }
      return true;
    });
  }, [certificates, filterEmployee, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          name: form.name,
          issuer: form.issuer || null,
          issueDate: form.issueDate || null,
          expiryDate: form.expiryDate || null,
          note: form.note || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Lỗi khi thêm chứng chỉ");
        return;
      }
      setShowModal(false);
      setForm(emptyForm);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa chứng chỉ "${name}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/certificates/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Chứng chỉ & Đào tạo</h1>
            <p className="text-gray-500 text-sm">Quản lý chứng chỉ và khóa học của nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} strokeWidth={1.5} />
          Thêm chứng chỉ
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <GraduationCap size={18} className="text-blue-500" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
            <div className="text-xs text-gray-500">Tổng chứng chỉ</div>
          </div>
        </div>
        <div className="bg-white border border-orange-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <Clock size={18} className="text-orange-500" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{summary.expiring}</div>
            <div className="text-xs text-gray-500">Sắp hết hạn (≤30 ngày)</div>
          </div>
        </div>
        <div className="bg-white border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-500" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            <div className="text-xs text-gray-500">Đã hết hạn</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">Tất cả nhân viên</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}{emp.code ? ` (${emp.code})` : ""}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="valid">Còn hạn</option>
          <option value="expiring">Sắp hết hạn</option>
          <option value="expired">Đã hết hạn</option>
          <option value="noexpiry">Không thời hạn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nhân viên</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Chứng chỉ / Khóa học</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Đơn vị cấp</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ngày cấp</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hết hạn</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                  <p>Chưa có chứng chỉ nào</p>
                </td>
              </tr>
            )}
            {filtered.map((cert) => {
              const st = getCertStatus(cert.expiryDate);
              return (
                <tr key={cert.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{cert.employeeName}</div>
                    {cert.employeeCode && <div className="text-xs text-gray-400">{cert.employeeCode}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{cert.name}</div>
                    {cert.note && <div className="text-xs text-gray-400 mt-0.5">{cert.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cert.issuer ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(cert.issueDate)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {cert.expiryDate ? formatDate(cert.expiryDate) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Infinity size={13} strokeWidth={1.5} /> Không TH
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.color}`}>
                      {st.type === "valid" && <CheckCircle size={11} strokeWidth={1.5} />}
                      {st.type === "expiring" && <Clock size={11} strokeWidth={1.5} />}
                      {st.type === "expired" && <AlertTriangle size={11} strokeWidth={1.5} />}
                      {st.type === "noexpiry" && <Infinity size={11} strokeWidth={1.5} />}
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(cert.id, cert.name)}
                      disabled={deleting === cert.id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                      title="Xóa"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Thêm chứng chỉ</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên *</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Chọn nhân viên —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}{emp.code ? ` (${emp.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên chứng chỉ / Khóa học *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="VD: Chứng chỉ An toàn lao động"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị cấp</label>
                <input
                  value={form.issuer}
                  onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                  placeholder="VD: Bộ Lao động"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày cấp</label>
                  <input
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Để trống = không thời hạn</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setForm(emptyForm); }}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : "Thêm chứng chỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
