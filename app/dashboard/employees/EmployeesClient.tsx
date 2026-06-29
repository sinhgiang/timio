"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { Upload, Download, X, CheckCircle2, AlertTriangle, ScanFace, Eye, Lock, Camera, KeyRound } from "lucide-react";
import PlanGate from "@/components/ui/PlanGate";

const FaceCapture = dynamic(() => import("@/components/admin/FaceCapture"), { ssr: false });
const ContractModal = dynamic(() => import("@/components/employees/ContractModal"), { ssr: false });
const EmployeeProfileModal = dynamic(() => import("@/components/employees/EmployeeProfileModal"), { ssr: false });

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
  pin: string | null;
  createdAt: string;
  baseSalary: number | null;
  joinDate: string | null;
  dateOfBirth: string | null;
  email: string | null;
  avatarUrl: string | null;
  phone: string | null;
  cccd: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBranch: string | null;
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
  const [contractTarget, setContractTarget] = useState<{ id: string; name: string } | null>(null);
  const [profileTarget, setProfileTarget] = useState<Employee | null>(null);
  const [localBranches, setLocalBranches] = useState<Branch[]>(branches);
  const [localDepts, setLocalDepts] = useState<string[]>(allDepartments);
  const [localPositions, setLocalPositions] = useState<string[]>(allPositions);
  const [customDepts, setCustomDepts] = useState<Set<string>>(() => new Set<string>());
  const [customPositions, setCustomPositions] = useState<Set<string>>(() => new Set<string>());
  const [customShifts, setCustomShifts] = useState<string[]>(savedShifts);

  // ─── Reset PIN ───────────────────────────────────────────────────────────────
  const [pinReset, setPinReset] = useState<{ id: string; value: string; saving: boolean } | null>(null);

  const doResetPin = async () => {
    if (!pinReset || !/^\d{4}$/.test(pinReset.value)) return;
    setPinReset((s) => s ? { ...s, saving: true } : s);
    await fetch(`/api/employees/${pinReset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinReset.value }),
    });
    setPinReset(null);
    router.refresh();
  };

  // ─── Import Excel ────────────────────────────────────────────────────────────
  type ImportRow = { name: string; code: string; pin?: string; department?: string; position?: string; baseSalary?: number; phone?: string; dateOfBirth?: string; joinDate?: string };
  type ImportResult = { row: number; name: string; ok: boolean; error?: string };
  const [showImport, setShowImport] = useState(false);
  const [importBranchId, setImportBranchId] = useState<string>("");
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; total: number; results: ImportResult[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const parseExcel = async (file: File) => {
    const { read, utils } = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = read(buf, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
    const rows: ImportRow[] = data.map((r) => {
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(r).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
          if (found && r[found] !== "") return String(r[found]).trim();
        }
        return "";
      };
      const parseDateStr = (s: string) => {
        if (!s) return "";
        // Try DD/MM/YYYY
        const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, "0")}-${dmY[1].padStart(2, "0")}`;
        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        return "";
      };
      return {
        name: get("Họ và tên", "họ tên", "tên", "name"),
        code: get("Mã NV", "mã nhân viên", "code", "mã"),
        pin: get("PIN", "pin"),
        department: get("Phòng ban", "phòng", "department"),
        position: get("Chức vụ", "chức danh", "vị trí", "position"),
        baseSalary: Number(get("Lương cơ bản", "lương", "salary", "baseSalary").replace(/[^\d]/g, "")) || 0,
        phone: get("Điện thoại", "sdt", "phone"),
        dateOfBirth: parseDateStr(get("Ngày sinh", "dob", "dateOfBirth")),
        joinDate: parseDateStr(get("Ngày vào làm", "ngày vào", "joinDate")),
      };
    }).filter((r) => r.name || r.code);
    setImportRows(rows);
    setImportResult(null);
  };

  const runImport = async () => {
    if (!importBranchId || importRows.length === 0) return;
    setImportLoading(true);
    const payload = importRows.map((r) => ({ ...r, branchId: importBranchId }));
    const res = await fetch("/api/employees/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setImportResult(data);
    setImportLoading(false);
    if (data.created > 0) router.refresh();
  };

  const downloadTemplate = () => {
    const rows = [
      ["Họ và tên", "Mã NV", "PIN", "Phòng ban", "Chức vụ", "Lương cơ bản", "Điện thoại", "Ngày sinh", "Ngày vào làm"],
      ["Nguyễn Văn An", "NV001", "1234", "Kế toán", "Kế toán trưởng", "10000000", "0901234567", "15/03/1990", "01/01/2024"],
      ["Trần Thị Bích", "NV002", "", "Kinh doanh", "Nhân viên", "8000000", "", "20/07/1995", ""],
    ];
    import("xlsx").then(({ utils, writeFile }) => {
      const ws = utils.aoa_to_sheet(rows);
      ws["!cols"] = rows[0].map(() => ({ wch: 20 }));
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Nhân viên");
      writeFile(wb, "mau-import-nhan-vien.xlsx");
    });
  };

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
      email: "",
      avatarUrl: "",
      phone: "",
      cccd: "",
      pin: "",
      bankName: "",
      bankAccount: "",
      bankBranch: "",
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
      email: emp.email ?? "",
      avatarUrl: emp.avatarUrl ?? "",
      phone: emp.phone ?? "",
      cccd: emp.cccd ?? "",
      pin: (emp.pin && !/^\$2[ab]\$/.test(emp.pin)) ? emp.pin : "",
      bankName: emp.bankName ?? "",
      bankAccount: emp.bankAccount ?? "",
      bankBranch: emp.bankBranch ?? "",
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
        email: form.email || null,
        avatarUrl: form.avatarUrl || null,
        phone: form.phone || null,
        cccd: form.cccd || null,
        pin: form.pin || undefined,
        bankName: form.bankName || null,
        bankAccount: form.bankAccount || null,
        bankBranch: form.bankBranch || null,
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
    if (descriptors.length > 0) {
      // Camera capture path — POST to server
      await fetch(`/api/employees/${faceTarget.id}/face`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptors }),
      });
    }
    // If descriptors.length === 0, mobile already saved the face via /api/register-face
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
        <FaceCapture employeeId={faceTarget.id} employeeName={faceTarget.name} onComplete={handleFaceComplete} onCancel={() => setFaceTarget(null)} />
      )}
      {contractTarget && (
        <ContractModal employeeId={contractTarget.id} employeeName={contractTarget.name} onClose={() => setContractTarget(null)} />
      )}
      {profileTarget && (
        <EmployeeProfileModal employee={profileTarget} onClose={() => setProfileTarget(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nhân viên</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeEmployees.length} đang làm · {registeredCount}/{employees.length} đã đăng ký khuôn mặt
          </p>
        </div>
        <div className="flex gap-2">
          <PlanGate requiredPlan="pro" feature="Import Excel" mode="inline">
            <button
              onClick={() => { setShowImport(true); setImportBranchId(branches[0]?.id ?? ""); setImportRows([]); setImportResult(null); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Upload size={14} /> Import Excel
            </button>
          </PlanGate>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >+ Thêm nhân viên</button>
        </div>
      </div>

      {/* ─── Import Excel Modal ─── */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-6">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
                <h2 className="text-lg font-bold text-gray-800">Import nhân viên từ Excel</h2>
                <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5">
                {/* Branch selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phân vào chi nhánh</label>
                  <select
                    value={importBranchId}
                    onChange={(e) => setImportBranchId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Template download */}
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download size={14} /> Tải file mẫu (.xlsx)
                </button>

                {/* File upload */}
                {!importResult && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chọn file Excel (.xlsx / .xls)</label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      onClick={() => importFileRef.current?.click()}
                    >
                      <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        {importRows.length > 0
                          ? `✅ Đã đọc ${importRows.length} nhân viên — nhấn Import để tiếp tục`
                          : "Nhấn để chọn file hoặc kéo thả vào đây"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Tối đa 500 dòng · .xlsx / .xls</p>
                    </div>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) parseExcel(f); e.target.value = ""; }}
                    />
                  </div>
                )}

                {/* Preview rows */}
                {importRows.length > 0 && !importResult && (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Xem trước ({importRows.length} dòng)
                    </div>
                    <div className="overflow-x-auto max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left px-4 py-2 text-gray-500">#</th>
                            <th className="text-left px-4 py-2 text-gray-500">Tên</th>
                            <th className="text-left px-4 py-2 text-gray-500">Mã NV</th>
                            <th className="text-left px-4 py-2 text-gray-500">Phòng ban</th>
                            <th className="text-left px-4 py-2 text-gray-500">Lương CB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {importRows.slice(0, 20).map((r, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2 font-medium text-gray-800">{r.name || <span className="text-red-400">Thiếu tên</span>}</td>
                              <td className="px-4 py-2 text-gray-600 font-mono">{r.code || <span className="text-red-400">Thiếu mã</span>}</td>
                              <td className="px-4 py-2 text-gray-500">{r.department || "—"}</td>
                              <td className="px-4 py-2 text-gray-600">{r.baseSalary ? formatCurrency(r.baseSalary) : "—"}</td>
                            </tr>
                          ))}
                          {importRows.length > 20 && (
                            <tr><td colSpan={5} className="text-center py-2 text-gray-400 text-xs">... và {importRows.length - 20} dòng nữa</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Result */}
                {importResult && (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${importResult.created === importResult.total ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                      {importResult.created === importResult.total
                        ? <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                        : <AlertTriangle size={18} className="text-amber-600 shrink-0" />}
                      <span className="text-sm font-medium">
                        Đã import {importResult.created}/{importResult.total} nhân viên thành công.
                      </span>
                    </div>
                    {importResult.results.filter((r) => !r.ok).length > 0 && (
                      <div className="border border-red-100 rounded-xl overflow-hidden">
                        <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">Dòng lỗi</div>
                        {importResult.results.filter((r) => !r.ok).map((r) => (
                          <div key={r.row} className="flex gap-3 px-4 py-2 border-b border-red-50 text-xs">
                            <span className="text-gray-400">#{r.row}</span>
                            <span className="font-medium text-gray-700">{r.name}</span>
                            <span className="text-red-500">{r.error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    {importResult ? "Đóng" : "Hủy"}
                  </button>
                  {importRows.length > 0 && !importResult && (
                    <button
                      onClick={runImport}
                      disabled={importLoading || !importBranchId}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importLoading ? "Đang import..." : `Import ${importRows.length} nhân viên`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Họ tên *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày tháng năm sinh</label>
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <Field label="Email cá nhân" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="VD: nguyenvan@gmail.com" />
                    {/* Avatar upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Ảnh đại diện</label>
                      <div className="flex items-center gap-3">
                        {form.avatarUrl ? (
                          <img src={form.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center border border-dashed border-blue-200">
                            <Camera size={20} className="text-blue-300" strokeWidth={1.5} />
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium border border-blue-100 transition-colors">
                            <Upload size={12} /> Chọn ảnh
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const canvas = document.createElement("canvas");
                                const img = new Image();
                                img.onload = () => {
                                  const size = Math.min(img.width, img.height);
                                  canvas.width = 200; canvas.height = 200;
                                  canvas.getContext("2d")?.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200);
                                  setForm((f) => ({ ...f, avatarUrl: canvas.toDataURL("image/jpeg", 0.8) }));
                                };
                                img.src = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          {form.avatarUrl && (
                            <button type="button" onClick={() => setForm((f) => ({ ...f, avatarUrl: "" }))} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                              <X size={11} /> Xóa ảnh
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">JPEG/PNG, tự động crop vuông 200×200px</p>
                    </div>
                    <Field label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="VD: 0901234567" />
                    <Field label="Căn cước công dân" value={form.cccd} onChange={(v) => setForm({ ...form, cccd: v })} placeholder="12 số" />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        PIN cổng nhân viên {!editingId && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={form.pin}
                        onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder={editingId ? "Để trống = giữ PIN cũ" : "4 số (VD: 1234)"}
                        maxLength={4}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">Nhân viên dùng để đăng nhập tại timio.vn/employee/{"{slug}"}</p>
                    </div>
                  </div>

                  {/* Thông tin ngân hàng */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Thông tin ngân hàng (để xuất phiếu lương)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Tên ngân hàng" value={form.bankName} onChange={(v) => setForm({ ...form, bankName: v })} placeholder="VD: Vietcombank" />
                      <Field label="Số tài khoản" value={form.bankAccount} onChange={(v) => setForm({ ...form, bankAccount: v })} placeholder="VD: 0123456789" />
                      <Field label="Chi nhánh NH" value={form.bankBranch} onChange={(v) => setForm({ ...form, bankBranch: v })} placeholder="VD: CN Hà Nội" />
                    </div>
                  </div>

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
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nhân viên</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phòng ban · Ca làm</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">PIN · Khuôn mặt</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...activeEmployees, ...inactiveEmployees].map((emp) => {
              const ov: ShiftOverride | null = emp.shiftOverride ? JSON.parse(emp.shiftOverride) : null;
              const shiftName = ov?.name ?? null;
              const shiftTime = ov ? `${ov.checkInTime}–${ov.checkOutTime}` : null;
              return (
                <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Col 1: Nhân viên */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt={emp.name} className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-blue-600 font-bold text-xs">{emp.name.split(" ").pop()?.charAt(0) ?? "?"}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">
                          {emp.name}
                          {emp.status !== "active" && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-normal">đã nghỉ</span>}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{emp.code}</p>
                      </div>
                    </div>
                  </td>

                  {/* Col 2: Phòng ban + Ca làm */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 leading-tight">
                      {emp.department ?? <span className="text-gray-300">—</span>}
                      {emp.position && <span className="text-gray-400 text-xs"> · {emp.position}</span>}
                    </p>
                    <p className="text-xs mt-0.5">
                      {shiftName ? (
                        <span className="text-blue-600 font-medium">{shiftName}</span>
                      ) : (
                        <span className="text-gray-400">Theo chi nhánh</span>
                      )}
                      {shiftTime && <span className="text-gray-400 ml-1">{shiftTime}</span>}
                    </p>
                  </td>

                  {/* Col 3: PIN + Khuôn mặt */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      {/* PIN — fixed width so column stays aligned */}
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">PIN</p>
                        {pinReset?.id === emp.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              maxLength={4}
                              value={pinReset.value}
                              onChange={(e) => setPinReset((s) => s ? { ...s, value: e.target.value.replace(/\D/g, "").slice(0, 4) } : s)}
                              className="w-12 text-center font-mono text-sm border border-blue-300 rounded px-1 py-0.5 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") doResetPin(); if (e.key === "Escape") setPinReset(null); }}
                              placeholder="0000"
                            />
                            <button onClick={doResetPin} disabled={pinReset.saving || !/^\d{4}$/.test(pinReset.value)} className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-40"><CheckCircle2 size={14} /></button>
                            <button onClick={() => setPinReset(null)} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {emp.pin && !/^\$2[ab]\$/.test(emp.pin) ? (
                              <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded tracking-widest">{emp.pin}</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                            <button
                              onClick={() => setPinReset({ id: emp.id, value: "", saving: false })}
                              title="Đặt lại PIN"
                              className="p-0.5 text-gray-300 hover:text-blue-500 transition-colors"
                            >
                              <KeyRound size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Divider */}
                      <div className="w-px h-8 bg-gray-100" />
                      {/* Khuôn mặt */}
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">Khuôn mặt</p>
                        {emp.hasFace ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle2 size={13} className="text-green-600" strokeWidth={2} />
                            </div>
                            <button onClick={() => handleDeleteFace(emp.id, emp.name)} className="text-gray-300 hover:text-red-400" title="Xóa khuôn mặt">
                              <X size={12} strokeWidth={2} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setFaceTarget({ id: emp.id, name: emp.name })} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-medium hover:bg-blue-100 border border-blue-100 transition-colors">
                            <ScanFace size={11} strokeWidth={1.5} /> Đăng ký
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Col 4: Thao tác */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setProfileTarget(emp)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Xem hồ sơ"
                      >
                        <Eye size={14} />
                      </button>
                      <PlanGate requiredPlan="business" feature="Hợp đồng lao động" mode="inline">
                        <button
                          onClick={() => setContractTarget({ id: emp.id, name: emp.name })}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-100 transition-colors"
                          title="Hợp đồng"
                        >
                          HĐ
                        </button>
                      </PlanGate>
                      <button
                        onClick={() => handleEdit(emp)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id, emp.name)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Chưa có nhân viên nào. Thêm nhân viên đầu tiên!</td></tr>
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
