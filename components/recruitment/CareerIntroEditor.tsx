"use client";
import { useState } from "react";
import { Pencil, Check, X, Loader2, Building2 } from "lucide-react";

// Editor giới thiệu công ty trên trang tuyển dụng công khai — chỉ hiện với owner đang xem.
export default function CareerIntroEditor({ initial }: { initial: string }) {
  const [intro, setIntro] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/company/career", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerIntro: draft }),
      });
      setIntro(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới thiệu công ty (hiện với ứng viên)</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="VD: Chúng tôi là chuỗi cà phê 20 chi nhánh, môi trường trẻ trung, lộ trình thăng tiến rõ ràng..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
          </button>
          <button onClick={() => { setDraft(intro); setEditing(false); }} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
            <X size={14} /> Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      {intro ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 relative">
          <div className="flex items-start gap-2.5">
            <Building2 size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line flex-1">{intro}</p>
          </div>
          <button onClick={() => { setDraft(intro); setEditing(true); }} className="absolute top-3 right-3 flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">
            <Pencil size={12} /> Sửa
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="w-full text-left bg-blue-50 border border-dashed border-blue-200 rounded-2xl p-4 text-sm text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-2">
          <Pencil size={15} /> Thêm giới thiệu công ty để thu hút ứng viên (chỉ bạn thấy nút này)
        </button>
      )}
    </div>
  );
}
