"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, FileText, Upload, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const CONTRACT_TYPES: Record<string, string> = {
  probation: "Thử việc",
  fixed_term: "Có thời hạn",
  indefinite: "Không thời hạn",
  seasonal: "Thời vụ",
  part_time: "Bán thời gian",
};

interface Contract {
  id: string;
  type: string;
  startDate: string;
  endDate: string | null;
  note: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
}

function getStatus(c: Contract): { label: string; cls: string; daysLeft?: number } {
  if (!c.endDate) return { label: "Không thời hạn", cls: "bg-blue-100 text-blue-700" };
  const today = new Date();
  const end = new Date(c.endDate);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: "Đã hết hạn", cls: "bg-red-100 text-red-700", daysLeft: diff };
  if (diff <= 30) return { label: `Còn ${diff} ngày`, cls: "bg-orange-100 text-orange-700", daysLeft: diff };
  return { label: `Còn ${diff} ngày`, cls: "bg-green-100 text-green-700", daysLeft: diff };
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

const EMPTY_FORM = { type: "fixed_term", startDate: "", endDate: "", note: "", fileUrl: "", fileName: "" };

export default function ContractModal({ employeeId, employeeName, onClose }: Props) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/contracts?employeeId=${employeeId}`)
      .then((r) => r.json())
      .then((data) => { setContracts(Array.isArray(data) ? data : []); setLoading(false); });
  }, [employeeId]);

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); setError(""); };
  const openEdit = (c: Contract) => {
    setForm({ type: c.type, startDate: c.startDate, endDate: c.endDate ?? "", note: c.note ?? "", fileUrl: c.fileUrl ?? "", fileName: c.fileName ?? "" });
    setEditId(c.id); setShowForm(true); setError("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File tối đa 5MB"); return; }
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, fileUrl: reader.result as string, fileName: file.name }));
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate) { setError("Cần nhập ngày bắt đầu"); return; }
    setSaving(true); setError("");
    const body = { ...form, endDate: form.endDate || null, note: form.note || null, fileUrl: form.fileUrl || null, fileName: form.fileName || null };
    const res = await fetch(editId ? `/api/contracts/${editId}` : "/api/contracts", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editId ? body : { ...body, employeeId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Lỗi lưu"); return; }
    if (editId) {
      setContracts((prev) => prev.map((c) => (c.id === editId ? data : c)));
    } else {
      setContracts((prev) => [data, ...prev]);
    }
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá hợp đồng này?")) return;
    await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    setContracts((prev) => prev.filter((c) => c.id !== id));
  };

  const active = contracts.find((c) => {
    if (!c.endDate) return true;
    return new Date(c.endDate) >= new Date();
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Hợp đồng lao động</h2>
            <p className="text-sm text-gray-500">{employeeName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus size={14} /> Thêm HĐ
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Form thêm/sửa */}
          {showForm && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="font-semibold text-blue-800 mb-4">{editId ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}</p>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Loại hợp đồng *</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
                    <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Ngày kết thúc <span className="text-gray-400">(để trống = không thời hạn)</span>
                    </label>
                    <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú (optional)</label>
                  <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="VD: Lương thử việc 85%, ký lại sau 2 tháng"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>

                {/* File upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">File hợp đồng (PDF/ảnh, tối đa 5MB)</label>
                  {form.fileUrl ? (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="text-xs text-gray-700 truncate flex-1">{form.fileName || "File đã upload"}</span>
                      <button type="button" onClick={() => setForm({ ...form, fileUrl: "", fileName: "" })} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center">
                      <Upload size={14} /> {uploadLoading ? "Đang đọc..." : "Chọn file PDF hoặc ảnh"}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} className="hidden" />
                </div>

                {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Đang lưu..." : editId ? "Lưu thay đổi" : "Tạo hợp đồng"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Contract list */}
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>
          ) : contracts.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Chưa có hợp đồng nào</p>
              <p className="text-xs text-gray-400 mt-1">Nhấn "Thêm HĐ" để tạo hợp đồng đầu tiên</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((c) => {
                const status = getStatus(c);
                const isActive = c.id === active?.id;
                return (
                  <div key={c.id} className={`border rounded-xl p-4 ${isActive ? "border-blue-200 bg-blue-50/30" : "border-gray-100 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">{CONTRACT_TYPES[c.type] ?? c.type}</span>
                          {isActive && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Hiệu lực</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {fmtDate(c.startDate)} → {c.endDate ? fmtDate(c.endDate) : "Không thời hạn"}
                        </p>
                        {c.note && <p className="text-xs text-gray-400 mt-1 italic">{c.note}</p>}
                        {status.daysLeft !== undefined && status.daysLeft <= 30 && status.daysLeft >= 0 && (
                          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Sắp hết hạn — cần ký gia hạn hoặc ký mới
                          </p>
                        )}
                        {status.daysLeft !== undefined && status.daysLeft < 0 && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle size={11} /> Đã hết hạn {Math.abs(status.daysLeft)} ngày trước
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {c.fileUrl && (
                          <a href={c.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Xem file">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <FileText size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 border-t border-gray-50 pt-3">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} /> Hệ thống tự động gửi email báo hết hạn hợp đồng trước 30 ngày
          </p>
        </div>
      </div>
    </div>
  );
}
