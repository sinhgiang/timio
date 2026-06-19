"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft, ArrowRight, Upload, CheckCircle2, AlertTriangle,
  FileSpreadsheet, Users, Clock, Layers, ChevronRight,
} from "lucide-react";

// ── Competitor definitions ──────────────────────────────────────────────────

interface Competitor {
  id: string;
  name: string;
  tagline: string;
  exportGuide: string[];
}

const COMPETITORS: Competitor[] = [
  {
    id: "tanca",
    name: "Tanca",
    tagline: "Phần mềm chấm công phổ biến nhất Việt Nam",
    exportGuide: [
      "Đăng nhập vào tanca.io → vào menu Báo cáo",
      "Chọn Báo cáo chấm công (hoặc Danh sách nhân viên)",
      "Chọn chi nhánh & khoảng thời gian cần xuất",
      'Bấm nút "Xuất Excel" ở góc phải màn hình',
      "Lưu file .xlsx xuống máy → upload vào bước tiếp theo",
    ],
  },
  {
    id: "amis",
    name: "Amis HRM (Misa)",
    tagline: "Phần mềm quản trị nhân sự của Misa",
    exportGuide: [
      "Đăng nhập vào amis.misa.vn → Chọn phân hệ Nhân sự",
      "Vào Danh sách nhân viên → bấm Xuất khẩu (Export)",
      "Hoặc vào Chấm công → Bảng tổng hợp → Xuất Excel",
      "Chọn định dạng Excel (.xlsx) và tải về",
      "Upload file vào bước tiếp theo",
    ],
  },
  {
    id: "base",
    name: "Base HRM",
    tagline: "Nền tảng quản lý nhân sự Base.vn",
    exportGuide: [
      "Đăng nhập vào app.base.vn → vào module HRM",
      "Chọn Nhân viên hoặc Chấm công",
      "Tìm nút Export / Xuất dữ liệu ở góc phải",
      "Chọn định dạng Excel và tải file về",
      "Upload file vào bước tiếp theo",
    ],
  },
  {
    id: "1office",
    name: "1Office",
    tagline: "Phần mềm quản lý doanh nghiệp 1Office",
    exportGuide: [
      "Đăng nhập vào 1office.vn → Chọn module Nhân sự / Chấm công",
      "Vào Báo cáo → Báo cáo chấm công",
      "Chọn khoảng thời gian và lọc theo phòng ban nếu cần",
      'Bấm "Xuất file" hoặc "Export Excel"',
      "Upload file .xlsx vào bước tiếp theo",
    ],
  },
  {
    id: "acheckin",
    name: "ACheckin",
    tagline: "Phần mềm chấm công khuôn mặt / vân tay",
    exportGuide: [
      "Đăng nhập vào ACheckin → Chọn Báo cáo",
      "Chọn Báo cáo chi tiết chấm công hoặc Danh sách nhân viên",
      "Chọn thiết bị, phòng ban và thời gian",
      'Bấm "Xuất Excel"',
      "Upload file .xlsx vào bước tiếp theo",
    ],
  },
  {
    id: "generic",
    name: "Phần mềm khác",
    tagline: "Bất kỳ phần mềm nào có thể xuất ra Excel",
    exportGuide: [
      "Mở phần mềm cũ và tìm chức năng Xuất / Export",
      "Chọn xuất ra định dạng Excel (.xlsx hoặc .xls)",
      "Đảm bảo file có dòng tiêu đề (header) ở hàng đầu tiên",
      "Tải file về máy",
      "Upload file vào bước tiếp theo — hệ thống sẽ tự nhận diện các cột",
    ],
  },
];

// ── Column alias tables ─────────────────────────────────────────────────────

const EMP_ALIASES: Record<string, string[]> = {
  name: ["họ và tên", "tên nhân viên", "họ tên", "full name", "name", "tên", "nhân viên", "họ & tên", "tên đầy đủ"],
  code: ["mã nv", "mã nhân viên", "employee id", "employee code", "mã", "id nhân viên", "mã số nv", "mã số nhân viên", "id nv", "staff id", "staff code"],
  department: ["phòng ban", "department", "bộ phận", "phòng/ban", "phòng", "dept"],
  position: ["chức vụ", "chức danh", "position", "job title", "vị trí", "vai trò", "title"],
  phone: ["điện thoại", "số điện thoại", "phone", "sđt", "phone number", "mobile", "di động"],
  baseSalary: ["lương cơ bản", "basic salary", "lương cb", "salary", "mức lương", "lương", "base salary"],
  dateOfBirth: ["ngày sinh", "date of birth", "dob", "birthday", "năm sinh", "ngày/tháng/năm sinh"],
};

const ATT_ALIASES: Record<string, string[]> = {
  employeeCode: ["mã nv", "mã nhân viên", "employee id", "employee code", "mã", "id nhân viên", "mã số nv", "mã số nhân viên", "id nv", "staff id", "staff code"],
  employeeName: ["họ và tên", "tên nhân viên", "họ tên", "full name", "name", "tên", "nhân viên", "tên đầy đủ"],
  date: ["ngày", "date", "ngày làm việc", "ngày chấm công", "workdate", "work date", "ngày/tháng/năm", "ngày công"],
  checkInTime: ["giờ vào", "vào", "check in", "time in", "giờ vào ca", "ca vào", "giờ đến", "in time", "giờ check in", "giờ check-in", "giờ checkin", "thời gian vào", "check-in", "checkin time"],
  checkOutTime: ["giờ ra", "ra", "check out", "time out", "giờ ra ca", "ca ra", "giờ về", "out time", "giờ check out", "giờ check-out", "giờ checkout", "thời gian ra", "check-out", "checkout time"],
  minutesLate: ["phút trễ", "đi muộn", "minutes late", "phút đi muộn", "số phút đi muộn", "late minutes", "phút muộn", "đi trễ", "muộn (phút)", "trễ (phút)", "số phút trễ"],
};

function detectColumns(headers: string[], aliases: Record<string, string[]>): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map(h => h.toLowerCase().trim());

  // Pass 1: exact match (highest priority)
  for (const [field, variants] of Object.entries(aliases)) {
    for (const v of variants) {
      const idx = lower.findIndex(h => h === v);
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  // Pass 2: partial/contains match (only for aliases >= 4 chars to avoid false positives)
  for (const [field, variants] of Object.entries(aliases)) {
    if (mapping[field]) continue;
    for (const v of variants) {
      if (v.length < 4) continue; // skip short aliases in fuzzy mode
      const idx = lower.findIndex(h => h.includes(v) || v.includes(h));
      if (idx !== -1) { mapping[field] = headers[idx]; break; }
    }
  }
  return mapping;
}

// ── Date / Time helpers ─────────────────────────────────────────────────────

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or D/M/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  // Excel date serial (number)
  const n = Number(s);
  if (!isNaN(n) && n > 40000 && n < 60000) {
    const d = new Date(Math.round((n - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseTime(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // HH:mm or H:mm or HH:mm:ss
  const m1 = s.match(/^(\d{1,2}):(\d{2})/);
  if (m1) return `${m1[1].padStart(2, "0")}:${m1[2]}`;
  // Excel time serial (fraction of day, 0–1)
  const n = Number(s);
  if (!isNaN(n) && n >= 0 && n < 1) {
    const totalMinutes = Math.round(n * 1440);
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  }
  return null;
}

// ── Types ───────────────────────────────────────────────────────────────────

type Step = "source" | "guide" | "type" | "upload" | "mapping" | "importing" | "done";
type ImportType = "employees" | "attendance" | "both";

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportResult {
  employees?: { created: number; total: number; errors: number };
  attendance?: { created: number; skipped: number; unmatched: string[]; errors: number };
}

interface Branch { id: string; name: string }

// ── Main Component ──────────────────────────────────────────────────────────

export default function MigrationWizard({ branches, companyId }: { branches: Branch[]; companyId: string }) {
  const [step, setStep] = useState<Step>("source");
  const [sourceId, setSourceId] = useState("");
  const [importType, setImportType] = useState<ImportType>("both");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [empMapping, setEmpMapping] = useState<Record<string, string>>({});
  const [attMapping, setAttMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  const source = COMPETITORS.find(c => c.id === sourceId);

  // ── Excel parse ─────────────────────────────────────────────────────────
  const parseFile = useCallback(async (f: File) => {
    setParsing(true);
    setParseError("");
    try {
      const { read, utils } = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = read(buf, { type: "array", cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false });
      if (raw.length < 2) { setParseError("File không có dữ liệu"); return; }
      const headers = (raw[0] as string[]).map(h => String(h ?? "").trim()).filter(Boolean);
      const rows: Record<string, string>[] = raw.slice(1).map(r => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = String((r as unknown[])[i] ?? "").trim(); });
        return obj;
      }).filter(r => Object.values(r).some(v => v));
      setParsed({ headers, rows });
      setEmpMapping(detectColumns(headers, EMP_ALIASES));
      setAttMapping(detectColumns(headers, ATT_ALIASES));
      setStep("mapping");
    } catch (e) {
      setParseError(`Không đọc được file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    parseFile(f);
  };

  // ── Extract records from parsed data ────────────────────────────────────
  const extractEmployees = () => {
    if (!parsed) return [];
    return parsed.rows
      .map(row => ({
        name: row[empMapping.name ?? ""]?.trim() ?? "",
        code: row[empMapping.code ?? ""]?.trim() ?? "",
        department: row[empMapping.department ?? ""]?.trim() || undefined,
        position: row[empMapping.position ?? ""]?.trim() || undefined,
        phone: row[empMapping.phone ?? ""]?.trim() || undefined,
        baseSalary: row[empMapping.baseSalary ?? ""] ? Number(String(row[empMapping.baseSalary ?? ""]).replace(/[^0-9]/g, "")) || 0 : 0,
        dateOfBirth: undefined,
        branchId,
      }))
      .filter(r => r.name && r.code);
  };

  const extractAttendance = () => {
    if (!parsed) return [];
    const recs = [];
    for (const row of parsed.rows) {
      const code = row[attMapping.employeeCode ?? ""]?.trim() ?? "";
      const name = row[attMapping.employeeName ?? ""]?.trim() ?? "";
      const rawDate = row[attMapping.date ?? ""]?.trim() ?? "";
      const date = parseDate(rawDate);
      if (!date) continue;
      const checkInTime = parseTime(row[attMapping.checkInTime ?? ""] ?? "");
      const checkOutTime = parseTime(row[attMapping.checkOutTime ?? ""] ?? "");
      const rawLate = row[attMapping.minutesLate ?? ""] ?? "";
      const minutesLate = rawLate ? Number(rawLate.replace(/[^0-9]/g, "")) || 0 : undefined;
      if (!code && !name) continue;
      recs.push({ employeeCode: code, employeeName: name, date, checkInTime: checkInTime ?? undefined, checkOutTime: checkOutTime ?? undefined, minutesLate });
    }
    return recs;
  };

  // ── Run import ───────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setStep("importing");
    const res: ImportResult = {};

    if (importType === "employees" || importType === "both") {
      const rows = extractEmployees();
      if (rows.length > 0) {
        try {
          const r = await fetch("/api/employees/import", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rows),
          });
          const d = await r.json();
          res.employees = { created: d.created ?? 0, total: d.total ?? rows.length, errors: (d.results ?? []).filter((x: {ok: boolean}) => !x.ok).length };
        } catch { res.employees = { created: 0, total: rows.length, errors: rows.length }; }
      } else {
        res.employees = { created: 0, total: 0, errors: 0 };
      }
    }

    if (importType === "attendance" || importType === "both") {
      const rows = extractAttendance();
      if (rows.length > 0) {
        try {
          const r = await fetch("/api/migrate/attendance", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rows),
          });
          const d = await r.json();
          res.attendance = { created: d.created ?? 0, skipped: d.skipped ?? 0, unmatched: d.unmatched ?? [], errors: (d.errors ?? []).length };
        } catch { res.attendance = { created: 0, skipped: 0, unmatched: [], errors: rows.length }; }
      } else {
        res.attendance = { created: 0, skipped: 0, unmatched: [], errors: 0 };
      }
    }

    setResult(res);
    setImporting(false);
    setStep("done");
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const STEPS = ["source", "guide", "type", "upload", "mapping", "importing", "done"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      {step !== "done" && step !== "importing" && (
        <div className="flex items-center gap-2 mb-8">
          {["Chọn nguồn", "Hướng dẫn", "Loại dữ liệu", "Upload", "Mapping"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                i < stepIdx ? "bg-blue-600 text-white" : i === stepIdx ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-gray-200 text-gray-400"
              }`}>{i < stepIdx ? "✓" : i + 1}</div>
              <span className={`text-xs hidden sm:inline ${i === stepIdx ? "text-gray-800 font-semibold" : "text-gray-400"}`}>{label}</span>
              {i < 4 && <ChevronRight size={14} className="text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Chọn nguồn ─────────────────────────────────────────── */}
      {step === "source" && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Bạn đang dùng phần mềm nào?</h2>
          <p className="text-gray-500 text-sm mb-6">Chọn để nhận hướng dẫn xuất dữ liệu phù hợp</p>
          <div className="grid grid-cols-2 gap-3">
            {COMPETITORS.map(c => (
              <button key={c.id} onClick={() => { setSourceId(c.id); setStep("guide"); }}
                className="text-left p-4 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all group">
                <p className="font-bold text-gray-800 group-hover:text-blue-700">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.tagline}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Hướng dẫn export ───────────────────────────────────── */}
      {step === "guide" && source && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Cách xuất dữ liệu từ {source.name}</h2>
          <p className="text-gray-500 text-sm mb-6">Làm theo các bước bên dưới, sau đó quay lại đây để upload</p>
          <div className="space-y-3 mb-8">
            {source.exportGuide.map((step, i) => (
              <div key={i} className="flex gap-3 p-4 bg-blue-50 rounded-xl">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-sm text-gray-700">{step}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("source")} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <ArrowLeft size={15} /> Quay lại
            </button>
            <button onClick={() => setStep("type")} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors">
              Đã xuất file, tiếp tục <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Chọn loại dữ liệu ──────────────────────────────────── */}
      {step === "type" && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Muốn import dữ liệu gì?</h2>
          <p className="text-gray-500 text-sm mb-6">Chọn loại dữ liệu bạn muốn chuyển sang Timio</p>
          <div className="space-y-3 mb-6">
            {([
              { id: "both", label: "Cả hai (Nhân viên + Chấm công)", icon: Layers, desc: "Nhập danh sách nhân viên và lịch sử chấm công cùng lúc" },
              { id: "employees", label: "Chỉ danh sách nhân viên", icon: Users, desc: "Nhập thông tin nhân viên: tên, mã, phòng ban, lương..." },
              { id: "attendance", label: "Chỉ lịch sử chấm công", icon: Clock, desc: "Nhập bản ghi giờ vào/ra từ trước (nhân viên phải đã có trong Timio)" },
            ] as { id: ImportType; label: string; icon: React.ElementType; desc: string }[]).map(opt => (
              <button key={opt.id} onClick={() => setImportType(opt.id)}
                className={`w-full text-left p-4 border-2 rounded-xl transition-all flex gap-4 items-start ${importType === opt.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${importType === opt.id ? "bg-blue-600" : "bg-gray-100"}`}>
                  <opt.icon size={20} className={importType === opt.id ? "text-white" : "text-gray-400"} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {(importType === "employees" || importType === "both") && branches.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <label className="block text-sm font-semibold text-amber-800 mb-2">Chi nhánh cho nhân viên mới</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400">
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep("guide")} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <ArrowLeft size={15} /> Quay lại
            </button>
            <button onClick={() => setStep("upload")} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors">
              Tiếp tục <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Upload ──────────────────────────────────────────────── */}
      {step === "upload" && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Upload file Excel</h2>
          <p className="text-gray-500 text-sm mb-6">Chọn file .xlsx hoặc .xls đã xuất từ phần mềm cũ</p>
          <label className="block w-full border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-blue-50/50 hover:bg-blue-50">
            <FileSpreadsheet size={48} strokeWidth={1} className="text-blue-400 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold">Kéo thả hoặc bấm để chọn file</p>
            <p className="text-gray-400 text-sm mt-1">Hỗ trợ .xlsx và .xls — tối đa 10MB</p>
            {file && <p className="mt-3 text-blue-700 font-medium text-sm">📄 {file.name}</p>}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
          </label>
          {parsing && <p className="text-center text-blue-600 text-sm mt-4 animate-pulse">Đang đọc file...</p>}
          {parseError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {parseError}
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("type")} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <ArrowLeft size={15} /> Quay lại
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Mapping ─────────────────────────────────────────────── */}
      {step === "mapping" && parsed && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Xác nhận mapping cột dữ liệu</h2>
          <p className="text-gray-500 text-sm mb-6">
            Hệ thống tự nhận diện {parsed.rows.length} hàng dữ liệu. Kiểm tra lại các cột bên dưới.
          </p>

          {(importType === "employees" || importType === "both") && (
            <div className="mb-6">
              <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={16} /> Nhân viên</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Trường Timio</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Cột trong file</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries({ name: "Tên *", code: "Mã NV *", department: "Phòng ban", position: "Chức vụ", phone: "Điện thoại", baseSalary: "Lương CB" }).map(([field, label]) => (
                      <tr key={field}>
                        <td className="px-4 py-2.5 text-gray-700">{label}</td>
                        <td className="px-4 py-2.5">
                          <select value={empMapping[field] ?? ""} onChange={e => setEmpMapping(m => ({ ...m, [field]: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
                            <option value="">— Bỏ qua —</option>
                            {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(importType === "attendance" || importType === "both") && (
            <div className="mb-6">
              <p className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><Clock size={16} /> Chấm công</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Trường Timio</th>
                    <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Cột trong file</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries({ employeeCode: "Mã NV *", employeeName: "Tên nhân viên", date: "Ngày *", checkInTime: "Giờ vào", checkOutTime: "Giờ ra", minutesLate: "Phút trễ" }).map(([field, label]) => (
                      <tr key={field}>
                        <td className="px-4 py-2.5 text-gray-700">{label}</td>
                        <td className="px-4 py-2.5">
                          <select value={attMapping[field] ?? ""} onChange={e => setAttMapping(m => ({ ...m, [field]: e.target.value }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400">
                            <option value="">— Bỏ qua —</option>
                            {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview first 3 rows */}
          <div className="mb-6 bg-gray-50 rounded-xl p-4 overflow-x-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Xem trước 3 hàng đầu</p>
            <table className="text-xs w-full">
              <thead><tr className="border-b border-gray-200">
                {parsed.headers.slice(0, 8).map(h => <th key={h} className="text-left px-2 py-1 text-gray-400 whitespace-nowrap font-medium">{h}</th>)}
              </tr></thead>
              <tbody>{parsed.rows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {parsed.headers.slice(0, 8).map(h => <td key={h} className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{row[h] || "—"}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
            Sẵn sàng import <strong>{parsed.rows.length} hàng</strong> dữ liệu.
            {importType !== "attendance" && <span> Nhân viên trùng mã sẽ bị bỏ qua.</span>}
            {importType !== "employees" && <span> Bản ghi chấm công đã tồn tại sẽ bị bỏ qua.</span>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep("upload"); setParsed(null); setFile(null); }}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              <ArrowLeft size={15} /> Chọn file khác
            </button>
            <button onClick={runImport}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors">
              <Upload size={16} /> Bắt đầu import
            </button>
          </div>
        </div>
      )}

      {/* ── Importing ───────────────────────────────────────────────────── */}
      {step === "importing" && (
        <div className="text-center py-16">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-xl font-bold text-gray-800">Đang import dữ liệu...</p>
          <p className="text-gray-400 text-sm mt-2">Vui lòng không đóng trang này</p>
        </div>
      )}

      {/* ── Done ────────────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <div>
          <div className="text-center mb-8">
            <CheckCircle2 size={64} strokeWidth={1} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Import hoàn tất!</h2>
          </div>
          <div className="space-y-4 mb-8">
            {result.employees && (
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="font-bold text-blue-800 flex items-center gap-2 mb-3"><Users size={18} /> Nhân viên</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-green-600">{result.employees.created}</p><p className="text-xs text-gray-500">Đã tạo</p></div>
                  <div><p className="text-2xl font-bold text-gray-400">{result.employees.total - result.employees.created - result.employees.errors}</p><p className="text-xs text-gray-500">Bỏ qua</p></div>
                  <div><p className="text-2xl font-bold text-red-500">{result.employees.errors}</p><p className="text-xs text-gray-500">Lỗi</p></div>
                </div>
              </div>
            )}
            {result.attendance && (
              <div className="p-5 bg-green-50 border border-green-100 rounded-xl">
                <p className="font-bold text-green-800 flex items-center gap-2 mb-3"><Clock size={18} /> Chấm công</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-green-600">{result.attendance.created}</p><p className="text-xs text-gray-500">Đã nhập</p></div>
                  <div><p className="text-2xl font-bold text-gray-400">{result.attendance.skipped}</p><p className="text-xs text-gray-500">Bỏ qua</p></div>
                  <div><p className="text-2xl font-bold text-red-500">{result.attendance.errors}</p><p className="text-xs text-gray-500">Lỗi</p></div>
                </div>
                {result.attendance.unmatched.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Không tìm thấy nhân viên ({result.attendance.unmatched.length}):</p>
                    <p className="text-xs text-amber-600">{result.attendance.unmatched.slice(0, 10).join(", ")}{result.attendance.unmatched.length > 10 ? ` +${result.attendance.unmatched.length - 10} khác` : ""}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setStep("source"); setSourceId(""); setParsed(null); setFile(null); setResult(null); }}
              className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50">
              Import file khác
            </button>
            <a href="/dashboard/employees" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm text-center transition-colors">
              Xem danh sách nhân viên →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
