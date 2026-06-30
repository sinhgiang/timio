"use client";
import { useState, useEffect, useCallback } from "react";
import { CalendarClock, Plus, Pencil, Trash2, Play, X } from "lucide-react";

type Employee = { id: string; name: string; code: string; department: string | null };
type DayPattern = { dayOfWeek: number; shiftLabel: string; checkIn: string; checkOut: string };
type ShiftTemplate = { id: string; name: string; pattern: string; createdAt: string };

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const SHIFT_PRESETS = [
  { label: "Ca sáng",   checkIn: "07:30", checkOut: "12:00" },
  { label: "Ca chiều",  checkIn: "13:00", checkOut: "17:30" },
  { label: "Ca cả ngày",checkIn: "07:30", checkOut: "17:30" },
  { label: "Ca tối",    checkIn: "18:00", checkOut: "22:00" },
  { label: "Nghỉ",      checkIn: "00:00", checkOut: "00:00" },
];

function getMondayOfWeek(d: Date): string {
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon.toISOString().slice(0, 10);
}

export default function ShiftTemplatesClient({ employees }: { employees: Employee[] }) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Template form
  const [form, setForm] = useState<{ id?: string; name: string; pattern: DayPattern[] } | null>(null);
  const [saving, setSaving] = useState(false);

  // Apply form
  const [applyForm, setApplyForm] = useState<{ templateId: string; employeeIds: string[]; weekStart: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/shift-templates");
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  function newPattern(): DayPattern[] {
    return [1, 2, 3, 4, 5].map(d => ({ dayOfWeek: d, shiftLabel: "Ca sáng", checkIn: "07:30", checkOut: "17:30" }));
  }

  async function save() {
    if (!form?.name || !form.pattern.length) return;
    setSaving(true);
    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/shift-templates/${form.id}` : "/api/shift-templates";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, pattern: form.pattern }),
    });
    setSaving(false);
    setForm(null);
    fetch_();
  }

  async function del(id: string) {
    if (!confirm("Xóa mẫu lịch ca này?")) return;
    await fetch(`/api/shift-templates/${id}`, { method: "DELETE" });
    fetch_();
  }

  async function applyTemplate() {
    if (!applyForm?.templateId || !applyForm.employeeIds.length || !applyForm.weekStart) return;
    setApplying(true);
    const res = await fetch(`/api/shift-templates/${applyForm.templateId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: applyForm.employeeIds, weekStart: applyForm.weekStart }),
    });
    const data = await res.json();
    setApplying(false);
    if (data.ok) {
      setApplyResult(`Đã tạo ${data.created} ca làm việc cho tuần ${applyForm.weekStart}`);
      setTimeout(() => { setApplyResult(null); setApplyForm(null); }, 3000);
    }
  }

  function updatePatternDay(idx: number, field: keyof DayPattern, value: string | number) {
    if (!form) return;
    const pattern = [...form.pattern];
    if (field === "dayOfWeek") pattern[idx] = { ...pattern[idx], dayOfWeek: Number(value) };
    else pattern[idx] = { ...pattern[idx], [field]: value };
    setForm({ ...form, pattern });
  }

  function applyPreset(idx: number, preset: typeof SHIFT_PRESETS[0]) {
    if (!form) return;
    const pattern = [...form.pattern];
    pattern[idx] = { ...pattern[idx], shiftLabel: preset.label, checkIn: preset.checkIn, checkOut: preset.checkOut };
    setForm({ ...form, pattern });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <CalendarClock size={20} className="text-indigo-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Mẫu lịch ca</h1>
            <p className="text-sm text-gray-500">Lưu mẫu ca theo tuần — áp dụng 1 click cho nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => setForm({ name: "", pattern: newPattern() })}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Tạo mẫu
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <CalendarClock size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-gray-400">Chưa có mẫu lịch ca nào</p>
          <p className="text-gray-400 text-sm mt-1">Tạo mẫu để áp dụng nhanh lịch ca hàng tuần</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map(tpl => {
            const pattern: DayPattern[] = JSON.parse(tpl.pattern);
            return (
              <div key={tpl.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">{tpl.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setApplyForm({ templateId: tpl.id, employeeIds: [], weekStart: getMondayOfWeek(new Date()) })}
                      className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Play size={11} /> Áp dụng
                    </button>
                    <button onClick={() => setForm({ id: tpl.id, name: tpl.name, pattern })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => del(tpl.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {pattern.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-7 text-gray-400 font-medium">{DAY_LABELS[d.dayOfWeek]}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.shiftLabel === "Nghỉ" ? "bg-gray-100 text-gray-500" : "bg-indigo-50 text-indigo-700"}`}>
                        {d.shiftLabel}
                      </span>
                      {d.shiftLabel !== "Nghỉ" && <span className="text-gray-400">{d.checkIn} – {d.checkOut}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template form modal */}
      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{form.id ? "Chỉnh sửa mẫu" : "Tạo mẫu lịch ca"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẫu</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" placeholder="VD: Ca sáng T2-T6" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Lịch ca theo ngày</label>
                  <button onClick={() => setForm({ ...form, pattern: [...form.pattern, { dayOfWeek: 6, shiftLabel: "Ca sáng", checkIn: "07:30", checkOut: "12:00" }] })} className="text-xs text-indigo-600">+ Thêm ngày</button>
                </div>
                <div className="space-y-2">
                  {form.pattern.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <select value={d.dayOfWeek} onChange={e => updatePatternDay(i, "dayOfWeek", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-16">
                        {DAY_LABELS.map((l, idx) => <option key={idx} value={idx}>{l}</option>)}
                      </select>
                      <select
                        value={d.shiftLabel}
                        onChange={e => {
                          const preset = SHIFT_PRESETS.find(p => p.label === e.target.value);
                          if (preset) applyPreset(i, preset);
                          else updatePatternDay(i, "shiftLabel", e.target.value);
                        }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-32"
                      >
                        {SHIFT_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                      </select>
                      {d.shiftLabel !== "Nghỉ" && (
                        <>
                          <input type="time" value={d.checkIn} onChange={e => updatePatternDay(i, "checkIn", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-28" />
                          <span className="text-gray-400 text-xs">–</span>
                          <input type="time" value={d.checkOut} onChange={e => updatePatternDay(i, "checkOut", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-28" />
                        </>
                      )}
                      <button onClick={() => setForm({ ...form, pattern: form.pattern.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving || !form.name} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Đang lưu..." : form.id ? "Cập nhật" : "Tạo mẫu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply modal */}
      {applyForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Áp dụng mẫu lịch ca</h3>
            {applyResult ? (
              <div className="text-center py-4">
                <div className="text-green-600 text-2xl mb-2">✓</div>
                <p className="text-gray-700">{applyResult}</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tuần bắt đầu (Thứ 2)</label>
                    <input type="date" value={applyForm.weekStart} onChange={e => setApplyForm({ ...applyForm, weekStart: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn nhân viên ({applyForm.employeeIds.length} đã chọn)</label>
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => setApplyForm({ ...applyForm, employeeIds: employees.map(e => e.id) })} className="text-xs text-indigo-600 hover:text-indigo-700">Chọn tất cả</button>
                      <button onClick={() => setApplyForm({ ...applyForm, employeeIds: [] })} className="text-xs text-gray-400 hover:text-gray-600">Bỏ tất cả</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
                      {employees.map(emp => (
                        <label key={emp.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyForm.employeeIds.includes(emp.id)}
                            onChange={e => setApplyForm({
                              ...applyForm,
                              employeeIds: e.target.checked
                                ? [...applyForm.employeeIds, emp.id]
                                : applyForm.employeeIds.filter(id => id !== emp.id),
                            })}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">{emp.name}</span>
                          {emp.department && <span className="text-xs text-gray-400">{emp.department}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setApplyForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
                  <button onClick={applyTemplate} disabled={applying || !applyForm.employeeIds.length} className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-60">
                    {applying ? "Đang áp dụng..." : `Áp dụng cho ${applyForm.employeeIds.length} NV`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
