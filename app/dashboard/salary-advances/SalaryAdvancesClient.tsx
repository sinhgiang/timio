"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, Trash2, Wallet,
  Smartphone, Banknote, Settings2, Info,
} from "lucide-react";

interface EmployeeRef {
  id: string;
  name: string;
  code: string;
  department: string | null;
  branch: { name: string };
}

export interface AdvanceRow {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  amount: number;
  note: string | null;
  status: string;
  source: string;
  fee: number;
  disbursedAt: string | null;
  requestedAt: string;
  approvedAt: string | null;
  employee: EmployeeRef;
}

type Advance = AdvanceRow;

export interface EwaConfig {
  ewaEnabled: boolean;
  ewaApprovalMode: string;
  ewaMaxPercent: number;
  ewaFeeType: string;
  ewaFeeValue: number;
  ewaMaxPerMonth: number;
}

interface Props {
  advances: Advance[];
  employees: EmployeeRef[];
  currentMonth: string;
  ewaConfig: EwaConfig;
  isOwner: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const STATUS_LABEL: Record<string, string> = {
  pending:  "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};
const STATUS_COLOR: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

export default function SalaryAdvancesClient({ advances: init, employees, currentMonth, ewaConfig, isOwner }: Props) {
  const router = useRouter();
  const [advances, setAdvances] = useState<Advance[]>(init);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", amount: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  // ─── Cấu hình EWA ───
  const [cfg, setCfg] = useState<EwaConfig>(ewaConfig);
  const [showCfg, setShowCfg] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgSaved, setCfgSaved] = useState(false);

  const saveCfg = async () => {
    setSavingCfg(true); setCfgSaved(false);
    const res = await fetch("/api/company/ewa-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (res.ok) { setCfg(await res.json()); setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2500); }
    setSavingCfg(false);
  };

  const handleDisburse = async (id: string) => {
    setActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/salary-advances/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disbursed: true }),
    });
    if (res.ok) {
      const updated = await res.json() as Advance;
      setAdvances((prev) => prev.map((a) => a.id === id ? updated : a));
    }
    setActing((p) => ({ ...p, [id]: false }));
  };

  const [yearStr, monStr] = currentMonth.split("-");
  const year  = parseInt(yearStr);
  const month = parseInt(monStr);

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/dashboard/salary-advances?month=${m}`);
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  const totalApproved  = advances.filter((a) => a.status === "approved").reduce((s, a) => s + a.amount, 0);
  const totalPending   = advances.filter((a) => a.status === "pending").reduce((s, a) => s + a.amount, 0);
  const countPending   = advances.filter((a) => a.status === "pending").length;

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setActing((p) => ({ ...p, [id]: true }));
    const res = await fetch(`/api/salary-advances/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json() as Advance;
      setAdvances((prev) => prev.map((a) => a.id === id ? updated : a));
    }
    setActing((p) => ({ ...p, [id]: false }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa khoản tạm ứng này?")) return;
    setActing((p) => ({ ...p, [id]: true }));
    await fetch(`/api/salary-advances/${id}`, { method: "DELETE" });
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    setActing((p) => ({ ...p, [id]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.amount) return;
    setSubmitting(true);
    const res = await fetch("/api/salary-advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: form.employeeId, year, month, amount: Number(form.amount), note: form.note || null }),
    });
    if (res.ok) {
      const created = await res.json() as Advance;
      setAdvances((prev) => [created, ...prev]);
      setForm({ employeeId: "", amount: "", note: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tạm ứng lương</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ghi nhận & duyệt tạm ứng — tự trừ vào phiếu lương</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-700 text-sm min-w-[130px] text-center capitalize">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Tổng phiếu</p>
          <p className="text-2xl font-bold text-gray-800">{advances.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
          <p className="text-xs text-yellow-600 mb-1">Chờ duyệt</p>
          <p className="text-2xl font-bold text-yellow-700">{countPending}</p>
          {totalPending > 0 && <p className="text-xs text-yellow-500 mt-0.5">{fmt(totalPending)}</p>}
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <p className="text-xs text-green-600 mb-1">Đã duyệt</p>
          <p className="text-2xl font-bold text-green-700">{fmt(totalApproved)}</p>
          <p className="text-xs text-green-500 mt-0.5">sẽ trừ khỏi lương tháng</p>
        </div>
      </div>

      {/* Cấu hình Ứng lương sớm (EWA) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <button onClick={() => setShowCfg((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center"><Smartphone size={18} className="text-amber-600" strokeWidth={1.5} /></div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Ứng lương sớm qua app nhân viên</p>
              <p className="text-xs text-gray-400">{cfg.ewaEnabled ? `Đang bật · duyệt ${cfg.ewaApprovalMode === "auto" ? "tự động" : "thủ công"} · tối đa ${cfg.ewaMaxPercent}% lương đã kiếm` : "Đang tắt — nhân viên chưa ứng được"}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.ewaEnabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{cfg.ewaEnabled ? "BẬT" : "TẮT"}</span>
        </button>

        {showCfg && (
          <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
            {!isOwner ? (
              <p className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-2"><Info size={13} /> Chỉ chủ công ty được thay đổi cấu hình ứng lương.</p>
            ) : (
              <>
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={cfg.ewaEnabled} onChange={(e) => setCfg({ ...cfg, ewaEnabled: e.target.checked })} className="w-4 h-4 accent-amber-600" />
                  Cho phép nhân viên ứng lương sớm trong app
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cách duyệt</label>
                    <select value={cfg.ewaApprovalMode} onChange={(e) => setCfg({ ...cfg, ewaApprovalMode: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="manual">Công ty duyệt tay</option>
                      <option value="auto">Tự động duyệt trong hạn mức</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ứng tối đa (% lương đã kiếm)</label>
                    <input type="number" min={1} max={100} value={cfg.ewaMaxPercent} onChange={(e) => setCfg({ ...cfg, ewaMaxPercent: Math.floor(Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Loại phí (nhân viên trả)</label>
                    <select value={cfg.ewaFeeType} onChange={(e) => setCfg({ ...cfg, ewaFeeType: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                      <option value="fixed">Cố định (đồng/lần)</option>
                      <option value="percent">Theo % số tiền ứng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{cfg.ewaFeeType === "percent" ? "Phí (phần nghìn, vd 15 = 1.5%)" : "Phí mỗi lần (đồng)"}</label>
                    <input type="number" min={0} step={cfg.ewaFeeType === "percent" ? 1 : 1000} value={cfg.ewaFeeValue} onChange={(e) => setCfg({ ...cfg, ewaFeeValue: Math.floor(Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Số lần ứng tối đa/tháng</label>
                    <input type="number" min={1} max={31} value={cfg.ewaMaxPerMonth} onChange={(e) => setCfg({ ...cfg, ewaMaxPerMonth: Math.floor(Number(e.target.value)) })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" /> Tiền ứng là <b>tiền công ty ứng trước</b> phần lương nhân viên đã đi làm — đến kỳ lương sẽ tự trừ lại. Timio chỉ tính toán, không giữ tiền.</p>
                <div className="flex items-center gap-2">
                  <button onClick={saveCfg} disabled={savingCfg} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50">
                    <Settings2 size={14} /> {savingCfg ? "Đang lưu..." : "Lưu cấu hình"}
                  </button>
                  {cfgSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} /> Đã lưu</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Thêm tạm ứng
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">Thêm khoản tạm ứng — {monthLabel}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              required
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">-- Chọn nhân viên --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
              ))}
            </select>
            <input
              required
              type="number"
              min={1}
              step={100000}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Số tiền (VD: 5000000)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ghi chú (tùy chọn)"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {advances.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Wallet size={32} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500 text-sm">Chưa có tạm ứng nào trong tháng này</p>
          <p className="text-gray-400 text-xs mt-1">Bấm "Thêm tạm ứng" để ghi nhận khoản ứng lương</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nhân viên</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Số tiền</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {advances.map((adv) => (
                <tr key={adv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 flex items-center gap-1.5">
                      {adv.employee.name}
                      {adv.source === "worker" && <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-normal"><Smartphone size={9} /> NV tự ứng</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {adv.employee.code}
                      {adv.employee.department && ` · ${adv.employee.department}`}
                      {` · ${adv.employee.branch.name}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {fmt(adv.amount)}
                    {adv.fee > 0 && <div className="text-[10px] text-gray-400 font-normal">phí {fmt(adv.fee)}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{adv.note ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[adv.status] ?? ""}`}>
                      {STATUS_LABEL[adv.status] ?? adv.status}
                    </span>
                    {adv.status === "approved" && (
                      adv.disbursedAt
                        ? <div className="text-[10px] text-green-600 mt-1 flex items-center justify-center gap-0.5"><CheckCircle2 size={10} /> Đã chi</div>
                        : <div className="text-[10px] text-blue-500 mt-1">Chờ chi tiền</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {adv.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(adv.id, "approved")}
                            disabled={acting[adv.id]}
                            title="Duyệt"
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle2 size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleAction(adv.id, "rejected")}
                            disabled={acting[adv.id]}
                            title="Từ chối"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          >
                            <XCircle size={16} strokeWidth={2} />
                          </button>
                        </>
                      )}
                      {adv.status === "approved" && !adv.disbursedAt && (
                        <button
                          onClick={() => handleDisburse(adv.id)}
                          disabled={acting[adv.id]}
                          title="Đánh dấu đã chuyển tiền cho nhân viên"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 disabled:opacity-40 transition-colors"
                        >
                          <Banknote size={13} /> Đã chi
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(adv.id)}
                        disabled={acting[adv.id]}
                        title="Xóa"
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:opacity-40 transition-colors"
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">
        <Wallet size={12} className="inline mr-1" />
        Khoản tạm ứng đã duyệt sẽ tự động trừ vào lương thực nhận trên trang Thanh toán lương và Phiếu lương.
      </p>
    </div>
  );
}
