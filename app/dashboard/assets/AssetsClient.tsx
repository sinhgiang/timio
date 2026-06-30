"use client";

import { useState } from "react";
import {
  Package,
  Plus,
  Laptop,
  Phone,
  Car,
  Key,
  CreditCard,
  UserPlus,
  RotateCcw,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

interface EmployeeRef {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

export interface AssetRow {
  id: string;
  companyId: string;
  code: string;
  name: string;
  category: string | null;
  employeeId: string | null;
  assignedAt: string | null;
  returnedAt: string | null;
  status: string;
  note: string | null;
  createdAt: string;
  employee: EmployeeRef | null;
}

interface Props {
  assets: AssetRow[];
  employees: EmployeeRef[];
}

const CATEGORY_LABEL: Record<string, string> = {
  laptop: "Laptop",
  phone: "Điện thoại",
  vehicle: "Xe",
  key: "Chìa khóa",
  card: "Thẻ từ",
  other: "Khác",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Còn trống",
  assigned: "Đã giao",
  damaged: "Hỏng",
  lost: "Mất",
};

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-50 text-green-700 border-green-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  damaged: "bg-orange-50 text-orange-700 border-orange-200",
  lost: "bg-red-50 text-red-600 border-red-200",
};

function CategoryIcon({ category }: { category: string | null }) {
  const cls = "w-5 h-5 text-gray-400";
  const sw = 1.5;
  switch (category) {
    case "laptop":  return <Laptop  size={20} strokeWidth={sw} className={cls} />;
    case "phone":   return <Phone   size={20} strokeWidth={sw} className={cls} />;
    case "vehicle": return <Car     size={20} strokeWidth={sw} className={cls} />;
    case "key":     return <Key     size={20} strokeWidth={sw} className={cls} />;
    case "card":    return <CreditCard size={20} strokeWidth={sw} className={cls} />;
    default:        return <Package size={20} strokeWidth={sw} className={cls} />;
  }
}

type FilterTab = "all" | "available" | "assigned" | "damaged_lost";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",           label: "Tất cả"      },
  { key: "available",     label: "Còn trống"   },
  { key: "assigned",      label: "Đã giao"     },
  { key: "damaged_lost",  label: "Hỏng/Mất"   },
];

export default function AssetsClient({ assets: init, employees }: Props) {
  const [assets, setAssets] = useState<AssetRow[]>(init);
  const [tab, setTab] = useState<FilterTab>("all");
  const [acting, setActing] = useState<Record<string, boolean>>({});

  // --- Add asset modal ---
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ code: "", name: "", category: "", note: "" });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // --- Assign modal ---
  const [assignTarget, setAssignTarget] = useState<AssetRow | null>(null);
  const [assignForm, setAssignForm] = useState({ employeeId: "", assignedAt: "" });
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // --- Status modal (damaged/lost) ---
  const [statusTarget, setStatusTarget] = useState<AssetRow | null>(null);
  const [statusValue, setStatusValue] = useState<"damaged" | "lost">("damaged");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const filtered = assets.filter((a) => {
    if (tab === "all") return true;
    if (tab === "available") return a.status === "available";
    if (tab === "assigned") return a.status === "assigned";
    if (tab === "damaged_lost") return a.status === "damaged" || a.status === "lost";
    return true;
  });

  const tabCount = (key: FilterTab) => {
    if (key === "all") return assets.length;
    if (key === "available") return assets.filter((a) => a.status === "available").length;
    if (key === "assigned") return assets.filter((a) => a.status === "assigned").length;
    if (key === "damaged_lost") return assets.filter((a) => a.status === "damaged" || a.status === "lost").length;
    return 0;
  };

  // Add asset
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.code || !addForm.name) return;
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addForm.code,
          name: addForm.name,
          category: addForm.category || undefined,
          note: addForm.note || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json() as AssetRow;
        setAssets((prev) => [created, ...prev]);
        setAddForm({ code: "", name: "", category: "", note: "" });
        setShowAdd(false);
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  // Assign to employee
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !assignForm.employeeId) return;
    setAssignSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${assignTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "assigned",
          employeeId: assignForm.employeeId,
          assignedAt: assignForm.assignedAt || new Date().toISOString(),
          returnedAt: null,
        }),
      });
      if (res.ok) {
        const updated = await res.json() as AssetRow;
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setAssignTarget(null);
        setAssignForm({ employeeId: "", assignedAt: "" });
      }
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Return asset
  const handleReturn = async (asset: AssetRow) => {
    if (!confirm(`Thu hồi "${asset.name}" từ ${asset.employee?.name ?? "nhân viên"}?`)) return;
    setActing((p) => ({ ...p, [asset.id]: true }));
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "available",
          employeeId: null,
          returnedAt: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const updated = await res.json() as AssetRow;
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
    } finally {
      setActing((p) => ({ ...p, [asset.id]: false }));
    }
  };

  // Mark damaged/lost
  const handleStatusSubmit = async () => {
    if (!statusTarget) return;
    setStatusSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${statusTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      if (res.ok) {
        const updated = await res.json() as AssetRow;
        setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setStatusTarget(null);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Delete asset
  const handleDelete = async (asset: AssetRow) => {
    if (!confirm(`Xóa tài sản "${asset.name}"?`)) return;
    setActing((p) => ({ ...p, [asset.id]: true }));
    try {
      const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      } else {
        const data = await res.json() as { error?: string };
        alert(data.error ?? "Không thể xóa");
      }
    } finally {
      setActing((p) => ({ ...p, [asset.id]: false }));
    }
  };

  const inputCls =
    "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Package size={20} strokeWidth={1.5} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tài sản bàn giao</h1>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý tài sản công ty giao cho nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Thêm tài sản
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"
            }`}>
              {tabCount(t.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Package size={36} strokeWidth={1.5} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chưa có tài sản nào</p>
          <p className="text-gray-400 text-xs mt-1">Bấm "Thêm tài sản" để thêm tài sản mới</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên tài sản</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Danh mục</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Được giao cho</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày giao</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{asset.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{asset.name}</p>
                    {asset.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{asset.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={asset.category} />
                      <span className="text-gray-600">
                        {asset.category ? CATEGORY_LABEL[asset.category] ?? asset.category : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[asset.status] ?? ""}`}>
                      {STATUS_LABEL[asset.status] ?? asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {asset.employee ? (
                      <div>
                        <p className="font-medium text-gray-700">{asset.employee.name}</p>
                        <p className="text-xs text-gray-400">{asset.employee.code}{asset.employee.department ? ` · ${asset.employee.department}` : ""}</p>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {asset.assignedAt
                      ? new Date(asset.assignedAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {asset.status === "available" && (
                        <button
                          onClick={() => { setAssignTarget(asset); setAssignForm({ employeeId: "", assignedAt: "" }); }}
                          disabled={acting[asset.id]}
                          title="Giao cho nhân viên"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                        >
                          <UserPlus size={16} strokeWidth={1.5} />
                        </button>
                      )}
                      {asset.status === "assigned" && (
                        <button
                          onClick={() => handleReturn(asset)}
                          disabled={acting[asset.id]}
                          title="Thu hồi tài sản"
                          className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40 transition-colors"
                        >
                          <RotateCcw size={16} strokeWidth={1.5} />
                        </button>
                      )}
                      {(asset.status === "available" || asset.status === "assigned") && (
                        <button
                          onClick={() => {
                            setStatusTarget(asset);
                            setStatusValue("damaged");
                          }}
                          disabled={acting[asset.id]}
                          title="Báo hỏng/mất"
                          className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 disabled:opacity-40 transition-colors"
                        >
                          <AlertTriangle size={16} strokeWidth={1.5} />
                        </button>
                      )}
                      {asset.status === "available" && (
                        <button
                          onClick={() => handleDelete(asset)}
                          disabled={acting[asset.id]}
                          title="Xóa tài sản"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === Add Asset Modal === */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Thêm tài sản mới</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} strokeWidth={1.5} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mã tài sản *</label>
                <input
                  required
                  type="text"
                  value={addForm.code}
                  onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="VD: TTS001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tên tài sản *</label>
                <input
                  required
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Laptop Dell Latitude 5420"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Danh mục</label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">-- Chọn danh mục --</option>
                  <option value="laptop">Laptop</option>
                  <option value="phone">Điện thoại</option>
                  <option value="vehicle">Xe</option>
                  <option value="key">Chìa khóa</option>
                  <option value="card">Thẻ từ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Ghi chú</label>
                <input
                  type="text"
                  value={addForm.note}
                  onChange={(e) => setAddForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú tùy chọn..."
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {addSubmitting ? "Đang lưu..." : "Thêm tài sản"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === Assign Modal === */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Giao tài sản cho nhân viên</h2>
                <p className="text-xs text-gray-500 mt-0.5">{assignTarget.name} · {assignTarget.code}</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} strokeWidth={1.5} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nhân viên nhận *</label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}){emp.department ? ` — ${emp.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Ngày giao</label>
                <input
                  type="date"
                  value={assignForm.assignedAt}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assignedAt: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {assignSubmitting ? "Đang lưu..." : "Xác nhận bàn giao"}
                </button>
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === Mark Damaged/Lost Modal === */}
      {statusTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Báo hỏng / Mất tài sản</h2>
              <button onClick={() => setStatusTarget(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} strokeWidth={1.5} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Tài sản: <span className="font-medium text-gray-800">{statusTarget.name}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStatusValue("damaged")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    statusValue === "damaged"
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Hỏng
                </button>
                <button
                  onClick={() => setStatusValue("lost")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${
                    statusValue === "lost"
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Mất
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleStatusSubmit}
                  disabled={statusSubmitting}
                  className="flex-1 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {statusSubmitting ? "Đang lưu..." : "Xác nhận"}
                </button>
                <button
                  onClick={() => setStatusTarget(null)}
                  className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
