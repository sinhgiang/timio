"use client";
import { useState, useEffect, useCallback } from "react";
import { Receipt, Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";

type Employee = { id: string; name: string; code: string; department: string | null };
type ExpenseClaim = {
  id: string;
  employeeId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  status: string;
  note: string | null;
  approvedBy: string | null;
  createdAt: string;
  employee: Employee;
};

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Di chuyển",
  meal: "Ăn uống",
  accommodation: "Lưu trú",
  entertainment: "Tiếp khách",
  other: "Khác",
};

const STATUS_CONFIG = {
  pending:  { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700", Icon: Clock },
  approved: { label: "Đã duyệt",  color: "bg-blue-100 text-blue-700",    Icon: CheckCircle },
  rejected: { label: "Từ chối",   color: "bg-red-100 text-red-700",      Icon: XCircle },
  paid:     { label: "Đã hoàn",   color: "bg-green-100 text-green-700",  Icon: DollarSign },
};

export default function ExpensesClient({ employees }: { employees: Employee[] }) {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<Partial<ExpenseClaim> & { employeeId?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const url = statusFilter === "all" ? "/api/expenses" : `/api/expenses?status=${statusFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setClaims(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    if (!form?.employeeId || !form?.title || !form?.amount || !form?.date) return;
    setSaving(true);
    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/expenses/${form.id}` : "/api/expenses";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm(null);
    fetch_();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetch_();
  }

  async function del(id: string) {
    if (!confirm("Xóa khoản chi phí này?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    fetch_();
  }

  const totalPending = claims.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const totalApproved = claims.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Receipt size={20} className="text-emerald-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Chi phí công tác</h1>
            <p className="text-sm text-gray-500">Quản lý khoản chi phí nhân viên cần hoàn tiền</p>
          </div>
        </div>
        <button
          onClick={() => setForm({ title: "", category: "transport", date: new Date().toISOString().slice(0, 10), employeeId: employees[0]?.id })}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-colors"
        >
          <Plus size={14} /> Thêm chi phí
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-2xl p-4 text-center">
          <p className="text-xl font-bold text-yellow-700">{totalPending.toLocaleString("vi-VN")} ₫</p>
          <p className="text-xs text-gray-500 mt-1">Chờ duyệt</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 text-center">
          <p className="text-xl font-bold text-blue-700">{totalApproved.toLocaleString("vi-VN")} ₫</p>
          <p className="text-xs text-gray-500 mt-1">Đã duyệt, chưa hoàn</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {(["all", "pending", "approved", "paid", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-gray-400">Chưa có khoản chi phí nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nhân viên</th>
                <th className="text-left px-4 py-3">Khoản chi</th>
                <th className="text-left px-4 py-3">Loại</th>
                <th className="text-left px-4 py-3">Ngày</th>
                <th className="text-right px-4 py-3">Số tiền</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {claims.map(c => {
                const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.employee?.name}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">{c.title}</p>
                      {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{CATEGORY_LABELS[c.category] || c.category}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{c.amount.toLocaleString("vi-VN")} ₫</td>
                    <td className="px-4 py-3">
                      <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 font-medium outline-none cursor-pointer ${cfg.color}`}>
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Duyệt</option>
                        <option value="rejected">Từ chối</option>
                        <option value="paid">Đã hoàn tiền</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setForm({ ...c, employeeId: c.employeeId })} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{form.id ? "Chỉnh sửa chi phí" : "Thêm chi phí"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                <select value={form.employeeId || ""} onChange={e => setForm({ ...form, employeeId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoản chi *</label>
                <input type="text" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" placeholder="VD: Xăng xe đi khách hàng" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại chi phí</label>
                  <select value={form.category || "other"} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none">
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày *</label>
                  <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (₫) *</label>
                <input type="number" min="0" value={form.amount || ""} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" placeholder="VD: 200000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <input type="text" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" placeholder="Tùy chọn" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Đang lưu..." : form.id ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
