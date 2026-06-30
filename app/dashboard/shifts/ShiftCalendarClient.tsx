"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarClock, X, Check } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

interface ShiftRow {
  id: string;
  employeeId: string;
  date: string;
  shiftLabel: string;
  checkIn: string;
  checkOut: string;
  note: string | null;
}

interface Props {
  employees: Employee[];
  initialShifts: ShiftRow[];
  weekStart: string; // YYYY-MM-DD (Monday)
}

const PRESET_SHIFTS = [
  { label: "Ca sáng",    checkIn: "07:30", checkOut: "12:00", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { label: "Ca chiều",   checkIn: "13:00", checkOut: "17:30", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { label: "Ca tối",     checkIn: "18:00", checkOut: "22:00", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "Ca cả ngày", checkIn: "07:30", checkOut: "17:30", color: "bg-green-100 text-green-800 border-green-200" },
  { label: "Nghỉ",       checkIn: "00:00", checkOut: "00:00", color: "bg-gray-100 text-gray-500 border-gray-200" },
];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return { dow: days[d.getDay()], day: d.getDate(), month: d.getMonth() + 1 };
}

function getShiftColor(label: string) {
  return PRESET_SHIFTS.find(s => s.label === label)?.color ?? "bg-indigo-100 text-indigo-800 border-indigo-200";
}

export default function ShiftCalendarClient({ employees, initialShifts, weekStart: initWeekStart }: Props) {
  const [weekStart, setWeekStart] = useState(initWeekStart);
  const [shifts, setShifts] = useState<ShiftRow[]>(initialShifts);
  const [modal, setModal] = useState<{ employeeId: string; date: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [customShift, setCustomShift] = useState({ label: "", checkIn: "08:00", checkOut: "17:00", note: "" });

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goWeek = useCallback((delta: number) => {
    setWeekStart(prev => addDays(prev, delta * 7));
    setShifts([]); // clear local state — page reloads via navigation... actually we fetch
  }, []);

  const navigateWeek = async (delta: number) => {
    const newStart = addDays(weekStart, delta * 7);
    const newEnd   = addDays(newStart, 6);
    setWeekStart(newStart);
    // Fetch shifts for new week
    const res = await fetch(`/api/shifts?from=${newStart}&to=${newEnd}`);
    if (res.ok) setShifts(await res.json());
  };

  const getShift = (employeeId: string, date: string) =>
    shifts.find(s => s.employeeId === employeeId && s.date === date);

  const openModal = (employeeId: string, date: string) => {
    setModal({ employeeId, date });
    setCustomShift({ label: "", checkIn: "08:00", checkOut: "17:00", note: "" });
  };

  const assignShift = async (preset: typeof PRESET_SHIFTS[number]) => {
    if (!modal) return;
    setSaving(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: modal.employeeId,
        date: modal.date,
        shiftLabel: preset.label,
        checkIn: preset.checkIn,
        checkOut: preset.checkOut,
      }),
    });
    if (res.ok) {
      const saved = await res.json() as ShiftRow;
      setShifts(prev => {
        const filtered = prev.filter(s => !(s.employeeId === modal.employeeId && s.date === modal.date));
        return [...filtered, saved];
      });
    }
    setSaving(false);
    setModal(null);
  };

  const assignCustomShift = async () => {
    if (!modal || !customShift.label.trim()) return;
    setSaving(true);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: modal.employeeId,
        date: modal.date,
        shiftLabel: customShift.label,
        checkIn: customShift.checkIn,
        checkOut: customShift.checkOut,
        note: customShift.note || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json() as ShiftRow;
      setShifts(prev => {
        const filtered = prev.filter(s => !(s.employeeId === modal.employeeId && s.date === modal.date));
        return [...filtered, saved];
      });
    }
    setSaving(false);
    setModal(null);
  };

  const clearShift = async () => {
    if (!modal) return;
    setSaving(true);
    await fetch("/api/shifts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: modal.employeeId, date: modal.date }),
    });
    setShifts(prev => prev.filter(s => !(s.employeeId === modal.employeeId && s.date === modal.date)));
    setSaving(false);
    setModal(null);
  };

  const weekLabel = (() => {
    const from = new Date(weekStart);
    const to   = new Date(addDays(weekStart, 6));
    return `${from.getDate()}/${from.getMonth() + 1} – ${to.getDate()}/${to.getMonth() + 1}/${to.getFullYear()}`;
  })();

  const modalEmployee = modal ? employees.find(e => e.id === modal.employeeId) : null;
  const modalDate = modal ? (() => { const f = formatDate(modal.date); return `${f.dow} ${f.day}/${f.month}`; })() : "";
  const existingShift = modal ? getShift(modal.employeeId, modal.date) : null;

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Lịch phân ca</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phân công ca làm việc theo tuần cho nhân viên</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-700 text-sm min-w-[160px] text-center">{weekLabel}</span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_SHIFTS.map(s => (
          <span key={s.label} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${s.color}`}>
            {s.label} {s.checkIn !== "00:00" && `${s.checkIn}–${s.checkOut}`}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <CalendarClock size={32} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 text-sm">Chưa có nhân viên nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[160px]">
                  Nhân viên
                </th>
                {weekDates.map(date => {
                  const { dow, day, month } = formatDate(date);
                  const isToday = date === new Date().toISOString().split("T")[0];
                  return (
                    <th key={date} className={`px-2 py-3 text-center text-xs font-semibold min-w-[100px] ${isToday ? "text-blue-600" : "text-gray-500 uppercase tracking-wide"}`}>
                      <span className={isToday ? "bg-blue-600 text-white rounded-full px-2 py-0.5" : ""}>
                        {dow}
                      </span>
                      <br />
                      <span className="font-normal text-gray-400">{day}/{month}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 border-r border-gray-100">
                    <p className="font-medium text-gray-800 text-sm">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.code}{emp.department && ` · ${emp.department}`}</p>
                  </td>
                  {weekDates.map(date => {
                    const shift = getShift(emp.id, date);
                    return (
                      <td key={date} className="px-1 py-1.5 text-center border-r border-gray-50 last:border-r-0">
                        <button
                          onClick={() => openModal(emp.id, date)}
                          className={`w-full rounded-lg px-1 py-1.5 text-xs font-medium border transition-all hover:ring-2 hover:ring-blue-300 ${
                            shift
                              ? getShiftColor(shift.shiftLabel)
                              : "bg-transparent border-dashed border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400"
                          }`}
                        >
                          {shift ? (
                            <>
                              <div className="font-semibold">{shift.shiftLabel}</div>
                              {shift.checkIn !== "00:00" && (
                                <div className="text-[10px] opacity-75">{shift.checkIn}–{shift.checkOut}</div>
                              )}
                            </>
                          ) : (
                            <span>+</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-bold text-gray-900">{modalEmployee?.name}</p>
                <p className="text-sm text-gray-500">{modalDate}</p>
                {existingShift && (
                  <span className={`inline-flex mt-1 items-center text-xs px-2 py-0.5 rounded-full border font-medium ${getShiftColor(existingShift.shiftLabel)}`}>
                    Hiện tại: {existingShift.shiftLabel}
                  </span>
                )}
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chọn ca</p>
            <div className="space-y-2 mb-4">
              {PRESET_SHIFTS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => assignShift(preset)}
                  disabled={saving}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 ${preset.color}`}
                >
                  <span>{preset.label}</span>
                  {preset.checkIn !== "00:00" && (
                    <span className="text-xs opacity-70">{preset.checkIn} – {preset.checkOut}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ca tùy chỉnh</p>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Tên ca (VD: Ca split)"
                  value={customShift.label}
                  onChange={e => setCustomShift(p => ({ ...p, label: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={customShift.checkIn} onChange={e => setCustomShift(p => ({ ...p, checkIn: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <input type="time" value={customShift.checkOut} onChange={e => setCustomShift(p => ({ ...p, checkOut: e.target.value }))}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <button
                  onClick={assignCustomShift}
                  disabled={saving || !customShift.label.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Check size={14} /> Lưu ca tùy chỉnh
                </button>
              </div>
            </div>

            {existingShift && (
              <button
                onClick={clearShift}
                disabled={saving}
                className="w-full px-4 py-2 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Xóa ca ngày này
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
