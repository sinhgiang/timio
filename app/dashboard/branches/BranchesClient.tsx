"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SHIFT_PRESETS } from "@/lib/presets";

interface Branch {
  id: string;
  name: string;
  checkInTime: string;
  checkOutTime: string;
  gracePeriod: number;
  workDays: string;
  employeeCount: number;
}

interface Props {
  companyId: string;
  companySlug: string;
  branches: Branch[];
}

const DAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

function parseWorkDays(s: string): number[] {
  return s.split(",").map((x) => parseInt(x.trim())).filter((n) => !isNaN(n));
}

function toggleDay(current: string, day: number): string {
  const set = new Set(parseWorkDays(current));
  set.has(day) ? set.delete(day) : set.add(day);
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.filter((d) => set.has(d)).join(",");
}

function workDaysLabel(workDays: string): string {
  const days = parseWorkDays(workDays);
  if (days.length === 0) return "—";
  const names = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days.map((d) => names[d]).join(", ");
}

const emptyForm = {
  name: "",
  checkInTime: "08:00",
  checkOutTime: "17:00",
  gracePeriod: "5",
  workDays: "1,2,3,4,5",
};

export default function BranchesClient({ companyId, companySlug, branches }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const checkinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkin/${companySlug}`
      : `/checkin/${companySlug}`;

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleEdit = (b: Branch) => {
    setForm({
      name: b.name,
      checkInTime: b.checkInTime,
      checkOutTime: b.checkOutTime,
      gracePeriod: String(b.gracePeriod),
      workDays: b.workDays,
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const body = { ...form, gracePeriod: Number(form.gracePeriod), companyId };

    if (editingId) {
      await fetch(`/api/branches/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setLoading(false);
    setShowForm(false);
    resetForm();
    router.refresh();
  };

  const handleDelete = async (id: string, name: string, count: number) => {
    if (count > 0) {
      alert(`Chi nhánh "${name}" đang có ${count} nhân viên. Chuyển nhân viên sang chi nhánh khác trước khi xóa.`);
      return;
    }
    if (!confirm(`Xóa chi nhánh "${name}"?`)) return;
    await fetch(`/api/branches/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chi nhánh</h1>
          <p className="text-gray-500 text-sm mt-0.5">{branches.length} chi nhánh · Mỗi chi nhánh có ca làm riêng</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Thêm chi nhánh
        </button>
      </div>

      {/* Kiosk URL */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-blue-700 mb-1">🖥️ Link chấm công (đặt điện thoại văn phòng mở link này)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-white px-3 py-2 rounded-lg border border-blue-200 text-blue-800 truncate">
            {checkinUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(checkinUrl)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >Copy</button>
        </div>
      </div>

      {/* Branch form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editingId ? "Sửa chi nhánh" : "Thêm chi nhánh mới"}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Preset quick-fill */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Áp dụng mẫu ca có sẵn</label>
              <select
                defaultValue=""
                onChange={(e) => {
                  const p = SHIFT_PRESETS[Number(e.target.value)];
                  if (p)
                    setForm((f) => ({
                      ...f,
                      checkInTime: p.checkInTime,
                      checkOutTime: p.checkOutTime,
                      gracePeriod: String(p.gracePeriod),
                      workDays: p.workDays,
                    }));
                }}
                className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Chọn mẫu để tự điền —</option>
                {SHIFT_PRESETS.map((p, i) => (
                  <option key={i} value={i}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên chi nhánh *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Văn phòng Hà Nội"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào ca</label>
                <input
                  type="time"
                  value={form.checkInTime}
                  onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra ca</label>
                <input
                  type="time"
                  value={form.checkOutTime}
                  onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ân hạn (phút)</label>
                <input
                  type="number" min="0" max="60"
                  value={form.gracePeriod}
                  onChange={(e) => setForm({ ...form, gracePeriod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày làm việc</label>
                <div className="flex gap-1 mt-1">
                  {DAYS.map((d) => {
                    const active = parseWorkDays(form.workDays).includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, workDays: toggleDay(f.workDays, d.value) }))}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                      >{d.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700">{loading ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Branch list */}
      <div className="space-y-3">
        {branches.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-800">{b.name}</div>
                <div className="text-sm text-gray-500 mt-1 flex gap-3 flex-wrap">
                  <span>⏰ {b.checkInTime} – {b.checkOutTime}</span>
                  <span>🗓 {workDaysLabel(b.workDays)}</span>
                  <span>⏱ Ân hạn {b.gracePeriod}p</span>
                  <span>👥 {b.employeeCount} nhân viên</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button onClick={() => handleEdit(b)} className="px-3 py-1 text-blue-600 text-sm hover:bg-blue-50 rounded-lg">Sửa</button>
                <button onClick={() => handleDelete(b.id, b.name, b.employeeCount)} className="px-3 py-1 text-red-500 text-sm hover:bg-red-50 rounded-lg">Xóa</button>
              </div>
            </div>
          </div>
        ))}
        {branches.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-1">Chưa có chi nhánh nào</p>
            <p className="text-sm">Bấm &quot;+ Thêm chi nhánh&quot; để tạo chi nhánh đầu tiên</p>
          </div>
        )}
      </div>
    </div>
  );
}
