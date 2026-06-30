"use client";
import { useState, useEffect, useCallback } from "react";
import { Megaphone, Plus, Pin, Pencil, Trash2, AlertTriangle, Info, Zap } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  pinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdBy: string | null;
};

const TYPE_CONFIG = {
  info:    { label: "Thông báo",  color: "bg-blue-100 text-blue-700",   border: "border-blue-200",   Icon: Info },
  warning: { label: "Lưu ý",     color: "bg-yellow-100 text-yellow-700", border: "border-yellow-200", Icon: AlertTriangle },
  urgent:  { label: "Khẩn",      color: "bg-red-100 text-red-700",     border: "border-red-200",    Icon: Zap },
};

export default function AnnouncementsClient() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Announcement> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function save() {
    if (!form?.title || !form?.content) return;
    setSaving(true);
    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/announcements/${form.id}` : "/api/announcements";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm(null);
    fetch_();
  }

  async function del(id: string) {
    if (!confirm("Xóa thông báo này?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    fetch_();
  }

  async function togglePin(ann: Announcement) {
    await fetch(`/api/announcements/${ann.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !ann.pinned }),
    });
    fetch_();
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-orange-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Bảng tin nội bộ</h1>
            <p className="text-sm text-gray-500">Thông báo từ HR đến toàn bộ nhân viên</p>
          </div>
        </div>
        <button
          onClick={() => setForm({ title: "", content: "", type: "info", pinned: false })}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-orange-600 transition-colors"
        >
          <Plus size={14} /> Đăng thông báo
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-gray-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(ann => {
            const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
            return (
              <div key={ann.id} className={`bg-white rounded-2xl border ${cfg.border} p-5 ${ann.pinned ? "ring-2 ring-orange-200" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {ann.pinned && <Pin size={12} className="text-orange-500 shrink-0" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <h3 className="font-semibold text-gray-800">{ann.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(ann.publishedAt).toLocaleString("vi-VN")}
                      {ann.createdBy ? ` · ${ann.createdBy}` : ""}
                      {ann.expiresAt ? ` · Hết hạn: ${new Date(ann.expiresAt).toLocaleDateString("vi-VN")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePin(ann)} className={`p-1.5 rounded-lg transition-colors ${ann.pinned ? "text-orange-500 bg-orange-50" : "text-gray-400 hover:bg-gray-100"}`} title={ann.pinned ? "Bỏ ghim" : "Ghim lên đầu"}>
                      <Pin size={14} />
                    </button>
                    <button onClick={() => setForm({ ...ann })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => del(ann.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{form.id ? "Chỉnh sửa thông báo" : "Đăng thông báo mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                <div className="flex gap-2">
                  {(["info", "warning", "urgent"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.type === t ? TYPE_CONFIG[t].color + " border-current" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                    >
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                <input type="text" value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="VD: Nghỉ lễ 2/9 năm nay" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung *</label>
                <textarea rows={4} value={form.content || ""} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none" placeholder="Nội dung thông báo..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hết hạn (tùy chọn)</label>
                <input type="date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ""} onChange={e => setForm({ ...form, expiresAt: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.pinned)} onChange={e => setForm({ ...form, pinned: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Ghim lên đầu bảng tin</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving || !form.title || !form.content} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm hover:bg-orange-600 disabled:opacity-60">
                {saving ? "Đang đăng..." : form.id ? "Cập nhật" : "Đăng thông báo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
