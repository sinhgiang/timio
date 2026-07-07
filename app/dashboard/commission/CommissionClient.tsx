"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Target, DollarSign } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  code: string;
  department: string | null;
  salaryType: string;
  commissionRate: number | null;
  kpiTarget: number | null;
  kpiBonus: number | null;
  baseSalary: number | null;
};

type SalesRecord = {
  id: string;
  employeeId: string;
  month: string;
  salesAmount: number;
  kpiScore: number | null;
  note: string | null;
  employee: Pick<Employee, "id" | "name" | "code" | "salaryType" | "commissionRate" | "kpiTarget" | "kpiBonus">;
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  fixed: "Lương cố định",
  commission: "Hoa hồng doanh số",
  kpi: "Thưởng KPI",
  hybrid: "Kết hợp",
};

const SALARY_TYPE_COLORS: Record<string, string> = {
  fixed: "bg-gray-100 text-gray-600",
  commission: "bg-blue-100 text-blue-700",
  kpi: "bg-purple-100 text-purple-700",
  hybrid: "bg-orange-100 text-orange-700",
};

function calcBonus(emp: Pick<Employee, "salaryType" | "commissionRate" | "kpiTarget" | "kpiBonus" | "baseSalary">, rec: Pick<SalesRecord, "salesAmount" | "kpiScore">): number {
  if (emp.salaryType === "commission" || emp.salaryType === "hybrid") {
    const commBonus = ((emp.commissionRate ?? 0) / 100) * rec.salesAmount;
    if (emp.salaryType === "hybrid" && emp.kpiBonus && emp.kpiTarget && rec.kpiScore != null) {
      const ratio = Math.min(rec.kpiScore / 100, 1);
      return commBonus + emp.kpiBonus * ratio;
    }
    return commBonus;
  }
  if (emp.salaryType === "kpi" && emp.kpiBonus && rec.kpiScore != null) {
    const ratio = Math.min(rec.kpiScore / 100, 1);
    return emp.kpiBonus * ratio;
  }
  return 0;
}

export default function CommissionClient({ employees }: { employees: Employee[] }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit employee salary type modal
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [savingEmp, setSavingEmp] = useState(false);

  // Record form
  const [recordForm, setRecordForm] = useState<{ empId: string; salesAmount: string; kpiScore: string; note: string } | null>(null);
  const [savingRec, setSavingRec] = useState(false);

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sales-records?month=${month}`);
    const data = await res.json();
    setRecords(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const recordByEmp = new Map<string, SalesRecord>();
  for (const r of records) recordByEmp.set(r.employeeId, r);

  const commissionEmployees = employees.filter(e => e.salaryType !== "fixed");
  const allEmployees = employees;
  // Bảng doanh số tháng: hiện NV có lương biến đổi HOẶC đã có nhập liệu tháng này
  const displayEmployees = allEmployees.filter(e => e.salaryType !== "fixed" || recordByEmp.has(e.id));

  async function saveRecord() {
    if (!recordForm) return;
    setSavingRec(true);
    await fetch("/api/sales-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: recordForm.empId,
        month,
        salesAmount: Number(recordForm.salesAmount) || 0,
        kpiScore: recordForm.kpiScore !== "" ? Number(recordForm.kpiScore) : null,
        note: recordForm.note || null,
      }),
    });
    setSavingRec(false);
    setRecordForm(null);
    fetchRecords();
  }

  async function deleteRecord(id: string) {
    if (!confirm("Xóa bản ghi này?")) return;
    await fetch(`/api/sales-records?id=${id}`, { method: "DELETE" });
    fetchRecords();
  }

  async function saveEmpSalary() {
    if (!editEmp) return;
    setSavingEmp(true);
    await fetch(`/api/employees/${editEmp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salaryType: editEmp.salaryType,
        commissionRate: editEmp.commissionRate,
        kpiTarget: editEmp.kpiTarget,
        kpiBonus: editEmp.kpiBonus,
      }),
    });
    setSavingEmp(false);
    setEditEmp(null);
    window.location.reload();
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-purple-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Lương Doanh Số / KPI</h1>
          <p className="text-sm text-gray-500">Nhập doanh số & điểm KPI để tính thưởng tháng</p>
        </div>
      </div>

      {/* Month picker + summary */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
        />
        <span className="text-sm text-gray-500">
          {commissionEmployees.length} nhân viên có lương biến đổi
        </span>
      </div>

      {/* Employee salary type config */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Cấu hình loại lương nhân viên</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nhân viên</th>
                <th className="text-left px-4 py-3">Phòng ban</th>
                <th className="text-left px-4 py-3">Loại lương</th>
                <th className="text-right px-4 py-3">Lương cơ bản</th>
                <th className="text-right px-4 py-3">Hoa hồng %</th>
                <th className="text-right px-4 py-3">Mục tiêu KPI</th>
                <th className="text-right px-4 py-3">Thưởng KPI</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.department || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SALARY_TYPE_COLORS[emp.salaryType] || "bg-gray-100 text-gray-600"}`}>
                      {SALARY_TYPE_LABELS[emp.salaryType] || emp.salaryType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{(emp.baseSalary ?? 0).toLocaleString("vi-VN")} ₫</td>
                  <td className="px-4 py-3 text-right">{emp.commissionRate != null ? `${emp.commissionRate}%` : "—"}</td>
                  <td className="px-4 py-3 text-right">{emp.kpiTarget != null ? emp.kpiTarget.toLocaleString("vi-VN") : "—"}</td>
                  <td className="px-4 py-3 text-right">{emp.kpiBonus != null ? emp.kpiBonus.toLocaleString("vi-VN") + " ₫" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditEmp({ ...emp })}
                      className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly records */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Doanh số & KPI tháng {month}</h2>
          <button
            onClick={() => setRecordForm({ empId: commissionEmployees[0]?.id || allEmployees[0]?.id || "", salesAmount: "", kpiScore: "", note: "" })}
            disabled={allEmployees.length === 0}
            className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Nhập dữ liệu
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : displayEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <Target size={32} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-gray-500 text-sm">Chưa có nhân viên nào có lương biến đổi.</p>
            <p className="text-gray-400 text-xs mt-1">Bấm biểu tượng ✏️ ở bảng “Cấu hình loại lương nhân viên” bên trên để đặt Hoa hồng / KPI cho nhân viên, hoặc bấm “Nhập dữ liệu” để nhập doanh số cho bất kỳ ai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Nhân viên</th>
                  <th className="text-left px-4 py-3">Loại lương</th>
                  <th className="text-right px-4 py-3">Doanh số</th>
                  <th className="text-right px-4 py-3">Điểm KPI</th>
                  <th className="text-right px-4 py-3 text-purple-600">Thưởng tính được</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayEmployees.map(emp => {
                  const rec = recordByEmp.get(emp.id);
                  const bonus = rec ? calcBonus(emp, rec) : 0;
                  const isExpanded = expanded.has(emp.id);
                  return (
                    <>
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SALARY_TYPE_COLORS[emp.salaryType]}`}>
                            {SALARY_TYPE_LABELS[emp.salaryType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{rec ? rec.salesAmount.toLocaleString("vi-VN") + " ₫" : "—"}</td>
                        <td className="px-4 py-3 text-right">{rec?.kpiScore != null ? `${rec.kpiScore} điểm` : "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-600">{rec ? bonus.toLocaleString("vi-VN") + " ₫" : "—"}</td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          <button
                            onClick={() => setRecordForm({ empId: emp.id, salesAmount: rec?.salesAmount.toString() || "", kpiScore: rec?.kpiScore?.toString() || "", note: rec?.note || "" })}
                            className="p-1.5 hover:bg-purple-50 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {rec && (
                            <button onClick={() => deleteRecord(rec.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                          {rec?.note && (
                            <button onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id); return s; })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && rec?.note && (
                        <tr key={`${emp.id}-note`} className="bg-gray-50">
                          <td colSpan={6} className="px-4 py-2 text-xs text-gray-500 italic">{rec.note}</td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-200">
                <tr className="bg-purple-50">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-purple-800">Tổng thưởng tháng {month}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">
                    {displayEmployees.reduce((sum, emp) => {
                      const rec = recordByEmp.get(emp.id);
                      return sum + (rec ? calcBonus(emp, rec) : 0);
                    }, 0).toLocaleString("vi-VN")} ₫
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Edit employee salary type modal */}
      {editEmp && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Cấu hình lương — {editEmp.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại lương</label>
                <select
                  value={editEmp.salaryType}
                  onChange={e => setEditEmp({ ...editEmp, salaryType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  <option value="fixed">Lương cố định</option>
                  <option value="commission">Hoa hồng doanh số</option>
                  <option value="kpi">Thưởng KPI</option>
                  <option value="hybrid">Kết hợp (hoa hồng + KPI)</option>
                </select>
              </div>

              {(editEmp.salaryType === "commission" || editEmp.salaryType === "hybrid") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Hoa hồng trên doanh số</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0" max="100" step="0.1"
                      value={editEmp.commissionRate ?? ""}
                      onChange={e => setEditEmp({ ...editEmp, commissionRate: e.target.value ? Number(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      placeholder="VD: 5"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">%</span>
                  </div>
                </div>
              )}

              {(editEmp.salaryType === "kpi" || editEmp.salaryType === "hybrid") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mục tiêu KPI (điểm hoặc doanh số)</label>
                    <input
                      type="number"
                      min="0"
                      value={editEmp.kpiTarget ?? ""}
                      onChange={e => setEditEmp({ ...editEmp, kpiTarget: e.target.value ? Number(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      placeholder="VD: 100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thưởng khi đạt 100% KPI (₫)</label>
                    <input
                      type="number"
                      min="0"
                      value={editEmp.kpiBonus ?? ""}
                      onChange={e => setEditEmp({ ...editEmp, kpiBonus: e.target.value ? Number(e.target.value) : null })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      placeholder="VD: 2000000"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditEmp(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button
                onClick={saveEmpSalary}
                disabled={savingEmp}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {savingEmp ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record form modal */}
      {recordForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nhập dữ liệu tháng {month}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                <select
                  value={recordForm.empId}
                  onChange={e => setRecordForm({ ...recordForm, empId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  {allEmployees.length === 0 && <option value="">Chưa có nhân viên</option>}
                  {allEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({SALARY_TYPE_LABELS[emp.salaryType] || emp.salaryType})</option>
                  ))}
                </select>
                {(() => {
                  const sel = allEmployees.find(e => e.id === recordForm.empId);
                  if (sel && sel.salaryType === "fixed") {
                    return (
                      <p className="text-xs text-amber-600 mt-1.5 leading-snug">
                        Nhân viên này đang để <b>Lương cố định</b> nên thưởng sẽ = 0₫. Đặt loại lương <b>Hoa hồng</b> hoặc <b>KPI</b> ở bảng “Cấu hình loại lương” bên trên để tính thưởng.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doanh số thực tế (₫)</label>
                <input
                  type="number"
                  min="0"
                  value={recordForm.salesAmount}
                  onChange={e => setRecordForm({ ...recordForm, salesAmount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                  placeholder="VD: 50000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm KPI (0–100, bỏ trống nếu không dùng)</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={recordForm.kpiScore}
                  onChange={e => setRecordForm({ ...recordForm, kpiScore: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                  placeholder="VD: 85"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={recordForm.note}
                  onChange={e => setRecordForm({ ...recordForm, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                  placeholder="Tùy chọn"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRecordForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
                Hủy
              </button>
              <button
                onClick={saveRecord}
                disabled={savingRec}
                className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                <DollarSign size={14} className="inline mr-1" />
                {savingRec ? "Đang lưu..." : "Lưu dữ liệu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
