"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";

const FaceCapture = dynamic(() => import("@/components/admin/FaceCapture"), { ssr: false });

// ─── Shift presets ─────────────────────────────────────────────────────────────

const SHIFT_QUICK = [
  { name: "Ca hành chính", checkInTime: "08:00", checkOutTime: "17:00", workDays: "1,2,3,4,5",     gracePeriod: 5  },
  { name: "Ca sáng",       checkInTime: "07:00", checkOutTime: "12:00", workDays: "1,2,3,4,5,6",   gracePeriod: 5  },
  { name: "Ca chiều",      checkInTime: "13:00", checkOutTime: "18:00", workDays: "1,2,3,4,5,6",   gracePeriod: 5  },
  { name: "Ca tối",        checkInTime: "18:00", checkOutTime: "23:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 10 },
  { name: "Ca gãy",        checkInTime: "07:30", checkOutTime: "17:30", workDays: "1,2,3,4,5",     gracePeriod: 5  },
  { name: "Ca đêm",        checkInTime: "22:00", checkOutTime: "06:00", workDays: "1,2,3,4,5,6",   gracePeriod: 10 },
];
const CUSTOM_SHIFT = "__custom__";

// ─── Work-day helpers ──────────────────────────────────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PenaltyRow { minutes: string; amount: string; }

interface ShiftOverride {
  name?: string;
  checkInTime: string;
  checkOutTime: string;
  workDays: string;
  gracePeriod: number;
  lateRules?: Array<{ minutes: number; amount: number }>;
  earlyLeaveRules?: Array<{ minutes: number; amount: number }>;
  perfectBonus?: number;
  useDefaultLate?: boolean;
  useDefaultEarlyLeave?: boolean;
  useDefaultBonus?: boolean;
}

interface CompanyPenaltyRule { fromMinutes: number; toMinutes: number; amount: number; type: string; }
interface CompanyRewardRule { id: string; condition: string; amount: number; label: string; }

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
  position: string | null;
  status: string;
  branchId: string;
  branchName: string;
  shiftOverride: string | null;
  hasFace: boolean;
  createdAt: string;
  baseSalary: number | null;
  joinDate: string | null;
  dateOfBirth: string | null;
}

interface Branch {
  id: string;
  name: string;
  checkInTime: string;
  checkOutTime: string;
  workDays: string;
  gracePeriod: number;
}

interface Props {
  employees: Employee[];
  branches: Branch[];
  allDepartments: string[];
  allPositions: string[];
  savedShifts: string[];
  companyId: string;
  penaltyRules: CompanyPenaltyRule[];
  rewardRules: CompanyRewardRule[];
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function EmployeesClient({
  employees, branches, allDepartments, allPositions, savedShifts, companyId,
  penaltyRules, rewardRules,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [localPenaltyRules, setLocalPenaltyRules] = useState<CompanyPenaltyRule[]>(penaltyRules);
  const [localRewardRules, setLocalRewardRules] = useState<CompanyRewardRule[]>(rewardRules);

  const refreshRules = useCallback(async () => {
    const [pRes, rRes] = await Promise.all([
      fetch("/api/penalty-rules"),
      fetch("/api/reward-rules"),
    ]);
    if (pRes.ok) setLocalPenaltyRules(await pRes.json());
    if (rRes.ok) setLocalRewardRules(await rRes.json());
  }, []);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) refreshRules(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshRules]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceTarget, setFaceTarget] = useState<{ id: string; name: string } | null>(null);
  const [localBranches, setLocalBranches] = useState<Branch[]>(branches);
  const [localDepts, setLocalDepts] = useState<string[]>(allDepartments);
  const [localPositions, setLocalPositions] = useState<string[]>(allPositions);
  const [customDepts, setCustomDepts] = useState<Set<string>>(() => new Set<string>());
  const [customPositions, setCustomPositions] = useState<Set<string>>(() => new Set<string>());
  const [customShifts, setCustomShifts] = useState<string[]>(savedShifts);

  const defaultBranch = branches[0];

  function makeDefaultForm() {
    const b = localBranches[0] ?? defaultBranch;
    const preset = SHIFT_QUICK.find(
      (p) => p.checkInTime === (b?.checkInTime ?? "08:00") && p.checkOutTime === (b?.checkOutTime ?? "17:00")
    );
    return {
      name: "",
      code: "",
      department: "",
      position: "",
      branchName: b?.name ?? "",
      status: "active",
      shiftPreset: preset?.name ?? SHIFT_QUICK[0].name,
      shiftCustomName: "",
      checkInTime: b?.checkInTime ?? "08:00",
      checkOutTime: b?.checkOutTime ?? "17:00",
      workDays: b?.workDays ?? "1,2,3,4,5",
      gracePeriod: String(b?.gracePeriod ?? 5),
      lateRules: [] as PenaltyRow[],
      earlyLeaveRules: [] as PenaltyRow[],
      perfectBonus: "",
      useDefaultLate: true,
      useDefaultEarlyLeave: true,
      useDefaultBonus: true,
      baseSalary: "",
      joinDate: "",
      dateOfBirth: "",
    };
  }

  const [form, setForm] = useState(makeDefaultForm);

  useEffect(() => { setLocalBranches(branches); }, [branches]);

  const selectedBranch = localBranches.find(
    (b) => b.name.toLowerCase() === form.branchName.toLowerCase()
  );

  const handleBranchChange = (name: string) => {
    const b = localBranches.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (b) {
      const preset = SHIFT_QUICK.find(
        (p) => p.checkInTime === b.checkInTime && p.checkOutTime === b.checkOutTime
      );
      setForm((f) => ({
        ...f,
        branchName: name,
        shiftPreset: preset?.name ?? f.shiftPreset,
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        workDays: b.workDays,
        gracePeriod: String(b.gracePeriod),
      }));
    } else {
      setForm((f) => ({ ...f, branchName: name }));
    }
  };

  const selectShiftPreset = (p: (typeof SHIFT_QUICK)[0]) => {
    setForm((f) => ({
      ...f,
      shiftPreset: p.name,
      shiftCustomName: "",
      checkInTime: p.checkInTime,
      checkOutTime: p.checkOutTime,
      workDays: p.workDays,
      gracePeriod: String(p.gracePeriod),
    }));
  };

  const saveCustomOption = async (type: "department" | "position" | "shift", name: string) => {
    await fetch("/api/company/custom-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });
  };

  const saveCustomShift = () => {
    const name = form.shiftCustomName.trim();
    if (!name) return;
    if (!customShifts.includes(name)) {
      setCustomShifts((prev) => [...prev, name]);
      void saveCustomOption("shift", name);
    }
    setForm((f) => ({ ...f, shiftPreset: name, shiftCustomName: "" }));
  };

  const resetForm = () => { setForm(makeDefaultForm()); setEditingId(null); };

  const handleEdit = (emp: Employee) => {
    const b = localBranches.find((x) => x.name === emp.branchName);
    const ov: ShiftOverride | null = emp.shiftOverride
      ? (JSON.parse(emp.shiftOverride) as ShiftOverride)
      : null;
    const shiftName = ov?.name ?? b?.checkInTime ? (ov?.name ?? "") : "";
    const matchPreset = SHIFT_QUICK.find((p) => p.name === shiftName);
    setForm({
      name: emp.name,
      code: emp.code,
      department: emp.department ?? "",
      position: emp.position ?? "",
      branchName: emp.branchName,
      status: emp.status,
      shiftPreset: matchPreset ? shiftName : (shiftName ? CUSTOM_SHIFT : SHIFT_QUICK[0].name),
      shiftCustomName: matchPreset ? "" : shiftName,
      checkInTime: ov?.checkInTime ?? b?.checkInTime ?? "08:00",
      checkOutTime: ov?.checkOutTime ?? b?.checkOutTime ?? "17:00",
      workDays: ov?.workDays ?? b?.workDays ?? "1,2,3,4,5",
      gracePeriod: String(ov?.gracePeriod ?? b?.gracePeriod ?? 5),
      lateRules: (ov?.lateRules ?? []).map((r) => ({ minutes: String(r.minutes), amount: String(r.amount) })),
      earlyLeaveRules: (ov?.earlyLeaveRules ?? []).map((r) => ({ minutes: String(r.minutes), amount: String(r.amount) })),
      perfectBonus: ov?.perfectBonus ? String(ov.perfectBonus) : "",
      useDefaultLate: ov?.useDefaultLate !== false,
      useDefaultEarlyLeave: ov?.useDefaultEarlyLeave !== false,
      useDefaultBonus: ov?.useDefaultBonus !== false,
      baseSalary: emp.baseSalary ? String(emp.baseSalary) : "",
      joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : "",
      dateOfBirth: emp.dateOfBirth ?? "",
    });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const employeeName = form.name;

    // Resolve branch
    let branchId: string | undefined;
    const matched = localBranches.find(
      (b) => b.name.toLowerCase() === form.branchName.trim().toLowerCase()
    );
    if (matched) {
      branchId = matched.id;
    } else if (form.branchName.trim()) {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.branchName.trim(), companyId,
          checkInTime: form.checkInTime, checkOutTime: form.checkOutTime,
          gracePeriod: Number(form.gracePeriod), workDays: form.workDays,
        }),
      });
      const nb = await res.json();
      branchId = nb.id;
      setLocalBranches((prev) => [...prev, { id: nb.id, name: nb.name, checkInTime: nb.checkInTime, checkOutTime: nb.checkOutTime, workDays: nb.workDays, gracePeriod: nb.gracePeriod }]);
    }

    if (!branchId) { setLoading(false); return; }

    const finalShiftName =
      form.shiftPreset === CUSTOM_SHIFT
        ? form.shiftCustomName || "Ca tùy chỉnh"
        : form.shiftPreset;

    const shiftOverride: ShiftOverride = {
      name: finalShiftName,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      workDays: form.workDays,
      gracePeriod: Number(form.gracePeriod),
      useDefaultLate: form.useDefaultLate,
      useDefaultEarlyLeave: form.useDefaultEarlyLeave,
      useDefaultBonus: form.useDefaultBonus,
      lateRules: form.lateRules.filter((r) => r.minutes && r.amount).map((r) => ({ minutes: Number(r.minutes), amount: Number(r.amount) })),
      earlyLeaveRules: form.earlyLeaveRules.filter((r) => r.minutes && r.amount).map((r) => ({ minutes: Number(r.minutes), amount: Number(r.amount) })),
      perfectBonus: form.perfectBonus ? Number(form.perfectBonus) : undefined,
    };

    const url = editingId ? `/api/employees/${editingId}` : "/api/employees";
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, code: form.code,
        department: form.department, position: form.position,
        branchId, status: form.status, shiftOverride, companyId,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
        joinDate: form.joinDate || null,
        dateOfBirth: form.dateOfBirth || null,
      }),
    });

    setLoading(false);
    setShowForm(false);
    resetForm();

    if (!editingId) {
      const created = (await res.json()) as { id?: string };
      if (created?.id) setFaceTarget({ id: created.id, name: employeeName });
    }

    router.refresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa nhân viên "${name}"?`)) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const handleFaceComplete = async (descriptors: number[][]) => {
    if (!faceTarget) return;
    await fetch(`/api/employees/${faceTarget.id}/face`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptors }),
    });
    setFaceTarget(null);
    router.refresh();
  };

  const handleDeleteFace = async (id: string, name: string) => {
    if (!confirm(`Xóa dữ liệu khuôn mặt của "${name}"?`)) return;
    await fetch(`/api/employees/${id}/face`, { method: "DELETE" });
    router.refresh();
  };

  const activeEmployees = employees.filter((e) => e.status === "active");
  const inactiveEmployees = employees.filter((e) => e.status !== "active");
  const registeredCount = employees.filter((e) => e.hasFace).length;
  const isNewBranch =
    form.branchName.trim() !== "" &&
    !localBranches.some((b) => b.name.toLowerCase() === form.branchName.trim().toLowerCase());

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {faceTarget && (
        <FaceCapture employeeName={faceTarget.name} onComplete={handleFaceComplete} onCancel={() => setFaceTarget(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nhân viên</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeEmployees.length} đang làm · {registeredCount}/{employees.length} đã đăng ký khuôn mặt
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >+ Thêm nhân viên</button>
      </div>

      {/* ─── Form Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] p-4 sm:p-8 my-4">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                {editingId ? "Sửa nhân viên" : "Thêm nhân viên mới"}
              </h2>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                {/* ── Left: Basic info ── */}
                <div className="space-y-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">Thông tin cơ bản</p>

                  <Field label="Họ tên *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                  <Field label="Mã nhân viên *" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required placeholder="VD: NV001" />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Lương cơ bản (₫/tháng)</label>
                      <input
                        type="number"
                        min={0}
                        step={100000}
                        value={form.baseSalary}
                        onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                        placeholder="VD: 10000000"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày vào làm</label>
                      <input
                        type="date"
                        value={form.joinDate}
                        onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày tháng năm sinh</label>
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  <ComboField
                    label="Phòng ban"
                    value={form.department}
                    onChange={(v) => setForm({ ...form, department: v })}
                    options={localDepts}
                    onAddOption={(v) => { setLocalDepts(p => [v, ...p]); setCustomDepts(p => new Set(Array.from(p).concat(v))); void saveCustomOption("department", v); }}
                    customEntries={customDepts}
                    placeholder="Chọn hoặc gõ tên mới"
                    entityName="phòng ban"
                    columns={2}
                  />

                  <ComboField
                    label="Chức vụ"
                    value={form.position}
                    onChange={(v) => setForm({ ...form, position: v })}
                    options={localPositions}
                    onAddOption={(v) => { setLocalPositions(p => [v, ...p]); setCustomPositions(p => new Set(Array.from(p).concat(v))); void saveCustomOption("position", v); }}
                    customEntries={customPositions}
                    placeholder="Chọn hoặc gõ tên mới"
                    entityName="chức vụ"
                  />

                  {/* Branch — moved to left column */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Chi nhánh *</label>
                    <BranchComboField value={form.branchName} onChange={handleBranchChange} branches={localBranches} />
                    {isNewBranch && <p className="text-xs text-blue-600 mt-1">Chi nhánh mới — sẽ được tạo khi lưu.</p>}
                  </div>

                  {editingId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="active">Đang làm</option>
                        <option value="inactive">Đã nghỉ</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* ── Right: Schedule + Rules ── */}
                <div className="space-y-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100">Lịch làm &amp; Quy tắc lương</p>

                  {/* ── Schedule section ── */}
                  <div className="bg-gray-50/70 rounded-xl p-4 space-y-4">
                    <label className="block text-sm font-semibold text-gray-700">Lịch làm việc</label>

                    {/* Shift preset buttons */}
                    <div className="flex flex-wrap gap-2">
                      {SHIFT_QUICK.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => selectShiftPreset(p)}
                          className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all border ${
                            form.shiftPreset === p.name
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                      {/* Custom shift chips — appear after presets, before "Tự đặt tên" */}
                      {customShifts.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, shiftPreset: name, shiftCustomName: "" }))}
                          className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all border ${
                            form.shiftPreset === name
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-white text-violet-600 border-violet-300 hover:bg-violet-50"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                      {/* "Tự đặt tên" always last */}
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, shiftPreset: CUSTOM_SHIFT, shiftCustomName: "" }))}
                        className={`px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all border ${
                          form.shiftPreset === CUSTOM_SHIFT
                            ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                            : "bg-white text-gray-500 border-dashed border-gray-300 hover:border-violet-400 hover:text-violet-600"
                        }`}
                      >
                        ✎ Tự đặt tên
                      </button>
                    </div>

                    {/* Custom shift name input + Lưu button */}
                    {form.shiftPreset === CUSTOM_SHIFT && (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={form.shiftCustomName}
                          onChange={(e) => setForm({ ...form, shiftCustomName: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); saveCustomShift(); }
                            if (e.key === "Escape") setForm((f) => ({ ...f, shiftPreset: SHIFT_QUICK[0].name, shiftCustomName: "" }));
                          }}
                          placeholder="Tên ca (VD: Ca kép, Ca đặc biệt...)"
                          className="flex-1 px-3 py-2 border border-violet-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                        <button
                          type="button"
                          onClick={saveCustomShift}
                          disabled={!form.shiftCustomName.trim()}
                          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-30 whitespace-nowrap"
                        >Lưu</button>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, shiftPreset: SHIFT_QUICK[0].name, shiftCustomName: "" }))}
                          className="px-3 py-2 text-gray-400 hover:text-red-500 rounded-lg text-base leading-none"
                        >✕</button>
                      </div>
                    )}

                    {/* Time fields */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Giờ vào</label>
                        <input type="time" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Giờ ra</label>
                        <input type="time" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cho phép trễ (phút)</label>
                        <input type="number" min="0" max="60" value={form.gracePeriod} onChange={(e) => setForm({ ...form, gracePeriod: e.target.value })} className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      </div>
                    </div>

                    {/* Work days */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Ngày làm việc</label>
                      <div className="flex gap-1.5">
                        {DAYS.map((d) => {
                          const active = parseWorkDays(form.workDays).includes(d.value);
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setForm((f) => ({ ...f, workDays: toggleDay(f.workDays, d.value) }))}
                              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-400 border border-gray-200 hover:border-blue-200 hover:text-blue-500"
                              }`}
                            >{d.label}</button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {parseWorkDays(form.workDays).length} ngày/tuần · {form.checkInTime}–{form.checkOutTime}
                        {selectedBranch && !isNewBranch && ` · Chi nhánh: ${selectedBranch.name}`}
                      </p>
                    </div>
                  </div>

                  {/* ── Đến muộn ── */}
                  <div className="bg-orange-50/60 rounded-xl p-4 space-y-3 border border-orange-100">
                    <label className="text-sm font-semibold text-orange-700">⏰ Đến muộn — quy tắc phạt</label>

                    {/* Toggle mặc định */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.useDefaultLate}
                        onChange={(e) => setForm((f) => ({ ...f, useDefaultLate: e.target.checked }))}
                        className="w-4 h-4 rounded accent-orange-500"
                      />
                      <span className="text-sm text-gray-600 font-medium">Dùng quy tắc mặc định của công ty</span>
                    </label>

                    {/* Preview quy tắc mặc định */}
                    {form.useDefaultLate && (
                      localPenaltyRules.filter(r => r.type !== "early_leave").length > 0 ? (
                        <div className="bg-white/80 rounded-lg p-3 border border-orange-100 space-y-1">
                          <p className="text-xs text-gray-400 font-medium mb-1">Quy tắc công ty (chỉ đọc):</p>
                          {localPenaltyRules.filter(r => r.type !== "early_leave").map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Trễ {r.fromMinutes}–{r.toMinutes} phút</span>
                              <span className="text-red-500 font-medium">−{formatCurrency(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-orange-400 italic bg-white/60 rounded-lg px-3 py-2">
                          Chưa có quy tắc mặc định —{" "}
                          <a href="/dashboard/settings?tab=penalty" target="_blank" rel="noopener noreferrer"
                            className="underline font-medium hover:text-orange-600">
                            Vào Cài đặt → Bảng phạt để thêm ↗
                          </a>
                        </p>
                      )
                    )}

                    {/* Quy tắc riêng */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          {form.useDefaultLate ? "Quy tắc riêng (bổ sung thêm):" : "Quy tắc phạt riêng:"}
                        </span>
                        <button type="button"
                          onClick={() => setForm((f) => ({ ...f, lateRules: [...f.lateRules, { minutes: "", amount: "" }] }))}
                          className="text-xs px-2.5 py-1 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 font-medium"
                        >+ Thêm mức</button>
                      </div>
                      {form.lateRules.length === 0 && !form.useDefaultLate && (
                        <p className="text-xs text-orange-400 italic">Nhấn &quot;+ Thêm mức&quot; để thêm quy tắc riêng.</p>
                      )}
                      {form.lateRules.length > 0 && (
                        <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1.5 items-center">
                          <span className="text-xs text-gray-400 font-medium">Trễ (phút)</span>
                          <span className="text-xs text-gray-400 font-medium">Phạt (₫)</span>
                          <span></span>
                          {form.lateRules.map((r, i) => (
                            <>
                              <input key={`lm${i}`} type="number" min="1" max="480" value={r.minutes}
                                onChange={(e) => setForm((f) => { const arr = [...f.lateRules]; arr[i] = { ...arr[i], minutes: e.target.value }; return { ...f, lateRules: arr }; })}
                                placeholder="VD: 5"
                                className="w-20 px-2 py-1.5 border border-orange-200 bg-white rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300" />
                              <input key={`la${i}`} type="number" min="0" value={r.amount}
                                onChange={(e) => setForm((f) => { const arr = [...f.lateRules]; arr[i] = { ...arr[i], amount: e.target.value }; return { ...f, lateRules: arr }; })}
                                placeholder="VD: 50000"
                                className="w-full px-2 py-1.5 border border-orange-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                              <button key={`lx${i}`} type="button"
                                onClick={() => setForm((f) => ({ ...f, lateRules: f.lateRules.filter((_, j) => j !== i) }))}
                                className="text-gray-300 hover:text-red-400 text-xl leading-none px-1">×</button>
                            </>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Về sớm ── */}
                  <div className="bg-purple-50/60 rounded-xl p-4 space-y-3 border border-purple-100">
                    <label className="text-sm font-semibold text-purple-700">🏃 Về sớm — quy tắc phạt</label>

                    {/* Toggle mặc định */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.useDefaultEarlyLeave}
                        onChange={(e) => setForm((f) => ({ ...f, useDefaultEarlyLeave: e.target.checked }))}
                        className="w-4 h-4 rounded accent-purple-500"
                      />
                      <span className="text-sm text-gray-600 font-medium">Dùng quy tắc mặc định của công ty</span>
                    </label>

                    {/* Preview quy tắc mặc định */}
                    {form.useDefaultEarlyLeave && (
                      localPenaltyRules.filter(r => r.type === "early_leave").length > 0 ? (
                        <div className="bg-white/80 rounded-lg p-3 border border-purple-100 space-y-1">
                          <p className="text-xs text-gray-400 font-medium mb-1">Quy tắc công ty (chỉ đọc):</p>
                          {localPenaltyRules.filter(r => r.type === "early_leave").map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Về sớm {r.fromMinutes}–{r.toMinutes} phút</span>
                              <span className="text-red-500 font-medium">−{formatCurrency(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-purple-400 italic bg-white/60 rounded-lg px-3 py-2">
                          Chưa có quy tắc mặc định —{" "}
                          <a href="/dashboard/settings?tab=penalty" target="_blank" rel="noopener noreferrer"
                            className="underline font-medium hover:text-purple-600">
                            Vào Cài đặt → Bảng phạt để thêm ↗
                          </a>
                        </p>
                      )
                    )}

                    {/* Quy tắc riêng */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-medium">
                          {form.useDefaultEarlyLeave ? "Quy tắc riêng (bổ sung thêm):" : "Quy tắc phạt riêng:"}
                        </span>
                        <button type="button"
                          onClick={() => setForm((f) => ({ ...f, earlyLeaveRules: [...f.earlyLeaveRules, { minutes: "", amount: "" }] }))}
                          className="text-xs px-2.5 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 font-medium"
                        >+ Thêm mức</button>
                      </div>
                      {form.earlyLeaveRules.length === 0 && !form.useDefaultEarlyLeave && (
                        <p className="text-xs text-purple-400 italic">Nhấn &quot;+ Thêm mức&quot; để thêm quy tắc riêng.</p>
                      )}
                      {form.earlyLeaveRules.length > 0 && (
                        <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1.5 items-center">
                          <span className="text-xs text-gray-400 font-medium">Về sớm (phút)</span>
                          <span className="text-xs text-gray-400 font-medium">Phạt (₫)</span>
                          <span></span>
                          {form.earlyLeaveRules.map((r, i) => (
                            <>
                              <input key={`em${i}`} type="number" min="1" max="480" value={r.minutes}
                                onChange={(e) => setForm((f) => { const arr = [...f.earlyLeaveRules]; arr[i] = { ...arr[i], minutes: e.target.value }; return { ...f, earlyLeaveRules: arr }; })}
                                placeholder="VD: 15"
                                className="w-20 px-2 py-1.5 border border-purple-200 bg-white rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-300" />
                              <input key={`ea${i}`} type="number" min="0" value={r.amount}
                                onChange={(e) => setForm((f) => { const arr = [...f.earlyLeaveRules]; arr[i] = { ...arr[i], amount: e.target.value }; return { ...f, earlyLeaveRules: arr }; })}
                                placeholder="VD: 50000"
                                className="w-full px-2 py-1.5 border border-purple-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                              <button key={`ex${i}`} type="button"
                                onClick={() => setForm((f) => ({ ...f, earlyLeaveRules: f.earlyLeaveRules.filter((_, j) => j !== i) }))}
                                className="text-gray-300 hover:text-red-400 text-xl leading-none px-1">×</button>
                            </>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Chuyên cần ── */}
                  <div className="bg-green-50/60 rounded-xl p-4 space-y-3 border border-green-100">
                    <label className="text-sm font-semibold text-green-700">🏆 Thưởng chuyên cần</label>

                    {/* Toggle mặc định */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.useDefaultBonus}
                        onChange={(e) => setForm((f) => ({ ...f, useDefaultBonus: e.target.checked }))}
                        className="w-4 h-4 rounded accent-green-500"
                      />
                      <span className="text-sm text-gray-600 font-medium">Dùng thưởng mặc định của công ty</span>
                    </label>

                    {/* Preview quy tắc thưởng mặc định */}
                    {form.useDefaultBonus && (
                      localRewardRules.length > 0 ? (
                        <div className="bg-white/80 rounded-lg p-3 border border-green-100 space-y-1">
                          <p className="text-xs text-gray-400 font-medium mb-1">Thưởng công ty (chỉ đọc):</p>
                          {localRewardRules.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{r.label} — {r.condition}</span>
                              <span className="text-green-600 font-medium">+{formatCurrency(r.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-green-500 italic bg-white/60 rounded-lg px-3 py-2">
                          Chưa có thưởng mặc định —{" "}
                          <a href="/dashboard/settings?tab=reward" target="_blank" rel="noopener noreferrer"
                            className="underline font-medium hover:text-green-700">
                            Vào Cài đặt → Bảng thưởng để thêm ↗
                          </a>
                        </p>
                      )
                    )}

                    {/* Thưởng riêng */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-gray-400 font-medium">
                        {form.useDefaultBonus ? "Thưởng riêng (bổ sung thêm):" : "Thưởng riêng:"}
                      </span>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" value={form.perfectBonus}
                          onChange={(e) => setForm({ ...form, perfectBonus: e.target.value })}
                          placeholder="VD: 500000 (bỏ trống nếu không có)"
                          className="flex-1 px-3 py-2 border border-green-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                        <span className="text-sm text-gray-500 shrink-0">₫/tháng</span>
                      </div>
                      <p className="text-xs text-green-600">Thưởng khi đi đủ ngày, không trễ, không về sớm cả tháng.</p>
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-1">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-5 sm:px-8 py-2.5 sm:py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Hủy</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                  {loading ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Lưu & Quét khuôn mặt →"}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {registeredCount === 0 && employees.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <div>
            <p className="font-medium text-yellow-800">Chưa có nhân viên nào đăng ký khuôn mặt</p>
            <p className="text-yellow-600 text-sm mt-0.5">Bấm nút 📷 bên cạnh từng nhân viên để đăng ký khuôn mặt cho họ.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Tên</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Mã</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Phòng ban · Chức vụ</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Ca làm</th>
              <th className="text-center px-3 py-3 text-gray-500 font-medium">Khuôn mặt</th>
              <th className="text-right px-5 py-3 text-gray-500 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...activeEmployees, ...inactiveEmployees].map((emp) => {
              const ov: ShiftOverride | null = emp.shiftOverride ? JSON.parse(emp.shiftOverride) : null;
              return (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    {emp.name}
                    {emp.status !== "active" && <span className="ml-2 text-xs text-gray-400">(đã nghỉ)</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono">{emp.code}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {emp.department ?? "—"}
                    {emp.position && <span className="text-gray-400"> · {emp.position}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {ov?.name ? (
                      <span className="text-blue-600 font-medium">{ov.name}</span>
                    ) : (
                      <span className="text-gray-400">Theo chi nhánh</span>
                    )}
                    {ov && <span className="text-gray-400 ml-1">{ov.checkInTime}–{ov.checkOutTime}</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {emp.hasFace ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-green-600 text-xs font-medium">✅ Đã đăng ký</span>
                        <button onClick={() => handleDeleteFace(emp.id, emp.name)} className="text-gray-300 hover:text-red-400 text-xs ml-1" title="Xóa khuôn mặt">×</button>
                      </div>
                    ) : (
                      <button onClick={() => setFaceTarget({ id: emp.id, name: emp.name })} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 border border-blue-200">📷 Đăng ký</button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:underline text-xs mr-3">Sửa</button>
                    <button onClick={() => handleDelete(emp.id, emp.name)} className="text-red-500 hover:underline text-xs">Xóa</button>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chưa có nhân viên nào. Thêm nhân viên đầu tiên!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Field ──────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
    </div>
  );
}

// ─── ComboField — custom dropdown with inline "Tạo mới" ────────────────────────

function ComboField({ label, value, onChange, options, onAddOption, customEntries, placeholder, entityName, columns = 1 }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; onAddOption?: (v: string) => void; customEntries?: Set<string>;
  placeholder?: string; entityName?: string; columns?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const [creatingInline, setCreatingInline] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Show all options when opening; filter only while user is typing
  const filtered = searchText.trim()
    ? options.filter((o) => o.toLowerCase().includes(searchText.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingInline(false);
        setNewItemName("");
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Ensure inline input is focused when it appears
  useEffect(() => {
    if (creatingInline) {
      // Use requestAnimationFrame so DOM has updated before we focus
      requestAnimationFrame(() => { inlineInputRef.current?.focus(); });
    }
  }, [creatingInline]);

  const confirmNew = () => {
    const name = newItemName.trim();
    if (!name) return;
    onAddOption?.(name);
    onChange(name);       // → fills the main field at top
    setCreatingInline(false);
    setNewItemName("");
    setOpen(false);
  };

  const handleOpenInline = () => {
    setOpen(true);
    setCreatingInline(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setSearchText(e.target.value); setOpen(true); setCreatingInline(false); }}
          onFocus={() => { setSearchText(""); setOpen(true); }}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); if (!creatingInline) { setSearchText(""); setOpen((o) => !o); } }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
        >▾</button>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {/* ── "Tạo mới" button OR inline input — same position ── */}
          {creatingInline ? (
            /* Inline create form — appears where the button was */
            <div className="border-b-2 border-emerald-300">
              <div className="p-3 bg-emerald-50">
                <p className="text-xs font-semibold text-emerald-700 mb-2">
                  ✚ Tên {entityName ?? "mục"} mới:
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inlineInputRef}
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); confirmNew(); }
                      if (e.key === "Escape") { setCreatingInline(false); setNewItemName(""); }
                    }}
                    placeholder="Gõ tên vào đây..."
                    className="flex-1 px-3 py-2 border-2 border-emerald-400 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); confirmNew(); }}
                    disabled={!newItemName.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-30 whitespace-nowrap"
                  >✓</button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setCreatingInline(false); setNewItemName(""); }}
                    className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-base leading-none"
                  >✕</button>
                </div>
              </div>
              {/* Matching suggestions while typing */}
              {newItemName.trim() && (() => {
                const matches = options.filter((o) =>
                  o.toLowerCase().includes(newItemName.trim().toLowerCase())
                );
                return matches.length > 0 ? (
                  <div className="bg-amber-50 px-3 py-2 max-h-36 overflow-y-auto">
                    <p className="text-xs text-amber-600 font-medium mb-1.5">Đã có sẵn — chọn để dùng:</p>
                    <div className="flex flex-col gap-0.5">
                      {matches.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt); setCreatingInline(false); setNewItemName(""); setOpen(false); }}
                          className="text-left px-2.5 py-1.5 text-sm rounded-lg text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            /* Default: "Tạo mới" button */
            <div className="p-1.5 border-b border-gray-100">
              <button
                type="button"
                onClick={handleOpenInline}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span>✚</span>
                <span>Tạo {entityName ?? "mục"} mới</span>
              </button>
            </div>
          )}

          {/* ── Options list ── */}
          {filtered.length > 0 && (
            <div className="max-h-52 overflow-y-auto p-2">
              <div className={`grid gap-0.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(opt); setSearchText(""); setOpen(false); setCreatingInline(false); }}
                    className={`text-left px-2.5 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-between gap-1 ${
                      value === opt ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt}</span>
                    {customEntries?.has(opt) && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 font-normal shrink-0">Mới</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && !creatingInline && (
            <p className="text-center text-sm text-gray-400 py-3">Không tìm thấy — bấm &quot;Tạo mới&quot; ở trên</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BranchComboField ──────────────────────────────────────────────────────────

function BranchComboField({ value, onChange, branches }: {
  value: string; onChange: (v: string) => void; branches: Branch[];
}) {
  const [open, setOpen] = useState(false);
  const [creatingInline, setCreatingInline] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const lv = value.trim().toLowerCase();
  const filtered = lv ? branches.filter((b) => b.name.toLowerCase().includes(lv)) : branches;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingInline(false);
        setNewBranchName("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (creatingInline) {
      requestAnimationFrame(() => { inlineInputRef.current?.focus(); });
    }
  }, [creatingInline]);

  const confirmBranch = () => {
    const name = newBranchName.trim();
    if (!name) return;
    onChange(name);
    setCreatingInline(false);
    setNewBranchName("");
    setOpen(false);
  };

  const handleOpenInline = () => {
    setOpen(true);
    setCreatingInline(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setCreatingInline(false); }}
        onFocus={() => setOpen(true)}
        placeholder="Chọn chi nhánh"
        required
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {/* ── "Tạo chi nhánh mới" button OR inline input ── */}
          {creatingInline ? (
            <div className="p-3 bg-emerald-50 border-b-2 border-emerald-300">
              <p className="text-xs font-semibold text-emerald-700 mb-2">✚ Tên chi nhánh mới:</p>
              <div className="flex gap-2">
                <input
                  ref={inlineInputRef}
                  autoFocus
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); confirmBranch(); }
                    if (e.key === "Escape") { setCreatingInline(false); setNewBranchName(""); }
                  }}
                  placeholder="Gõ tên chi nhánh vào đây..."
                  className="flex-1 px-3 py-2 border-2 border-emerald-400 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 shadow-inner"
                />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); confirmBranch(); }}
                  disabled={!newBranchName.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-30 whitespace-nowrap"
                >✓</button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setCreatingInline(false); setNewBranchName(""); }}
                  className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-base leading-none"
                >✕</button>
              </div>
            </div>
          ) : (
            <div className="p-1.5 border-b border-gray-100">
              <button
                type="button"
                onClick={handleOpenInline}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="text-base leading-none">✚</span>
                <span>Tạo chi nhánh mới</span>
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="p-1 max-h-44 overflow-y-auto">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(b.name); setOpen(false); setCreatingInline(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    value === b.name ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
          {filtered.length === 0 && !creatingInline && (
            <p className="px-3 py-3 text-sm text-gray-400 text-center">Chưa có chi nhánh — bấm &quot;Tạo mới&quot; ở trên.</p>
          )}
        </div>
      )}
    </div>
  );
}
