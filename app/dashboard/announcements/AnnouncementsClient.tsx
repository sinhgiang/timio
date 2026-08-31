"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { upload } from "@vercel/blob/client";
import {
  Megaphone, Plus, Pin, Pencil, Trash2, AlertTriangle, Info, Zap,
  Image as ImageIcon, Video, Link2, X, Loader2, Send, MessageCircle,
} from "lucide-react";

type LinkPreview = { title: string; description: string; image: string | null; embedUrl: string | null; provider: string; url: string };
type Comment = { id: string; content: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; actorType: string };
type ReactionKey = "like" | "love" | "haha" | "wow" | "sad" | "angry";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  pinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdBy: string | null;
  images: string[];
  videoUrl: string | null;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  hashtags: string[];
  reactionCounts: Partial<Record<ReactionKey, number>>;
  myReaction: ReactionKey | null;
  comments: Comment[];
};

const TYPE_CONFIG = {
  info:    { label: "Thông báo",  color: "bg-blue-100 text-blue-700",   border: "border-blue-200",   Icon: Info },
  warning: { label: "Lưu ý",     color: "bg-yellow-100 text-yellow-700", border: "border-yellow-200", Icon: AlertTriangle },
  urgent:  { label: "Khẩn",      color: "bg-red-100 text-red-700",     border: "border-red-200",    Icon: Zap },
};

const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "like", emoji: "👍", label: "Thích" },
  { key: "love", emoji: "❤️", label: "Yêu thích" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Buồn" },
  { key: "angry", emoji: "😡", label: "Phẫn nộ" },
];

type FormState = Partial<Announcement> & { images?: string[] };

export default function AnnouncementsClient() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

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
    setLinkDraft("");
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

  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !form) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, 10 - (form.images?.length || 0))) {
        const blob = await upload(`announcements/${Date.now()}-${file.name}`, file, { access: "public", handleUploadUrl: "/api/upload/blob" });
        urls.push(blob.url);
      }
      setForm((f) => (f ? { ...f, images: [...(f.images || []), ...urls] } : f));
    } catch (err) {
      alert("Tải ảnh lỗi: " + (err instanceof Error ? err.message : "không rõ nguyên nhân"));
    } finally {
      setUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploading(true);
    try {
      const blob = await upload(`announcements/${Date.now()}-${file.name}`, file, { access: "public", handleUploadUrl: "/api/upload/blob" });
      setForm((f) => (f ? { ...f, videoUrl: blob.url } : f));
    } catch (err) {
      alert("Tải video lỗi: " + (err instanceof Error ? err.message : "không rõ nguyên nhân"));
    } finally {
      setUploading(false);
      if (vidInputRef.current) vidInputRef.current.value = "";
    }
  }

  async function attachLink() {
    if (!linkDraft.trim() || !form) return;
    setLinkLoading(true);
    try {
      const res = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkDraft.trim() }),
      });
      if (res.ok) {
        const preview = await res.json();
        setForm((f) => (f ? { ...f, linkUrl: linkDraft.trim(), linkPreview: preview } : f));
      } else {
        setForm((f) => (f ? { ...f, linkUrl: linkDraft.trim(), linkPreview: null } : f));
      }
    } finally {
      setLinkLoading(false);
    }
  }

  async function react(ann: Announcement, emoji: ReactionKey) {
    // Cập nhật lạc quan cho mượt, gọi API rồi đồng bộ lại danh sách.
    setItems((prev) => prev.map((a) => {
      if (a.id !== ann.id) return a;
      const wasMine = a.myReaction;
      const counts = { ...a.reactionCounts };
      if (wasMine) counts[wasMine] = Math.max(0, (counts[wasMine] || 1) - 1);
      const myReaction = wasMine === emoji ? null : emoji;
      if (myReaction) counts[myReaction] = (counts[myReaction] || 0) + 1;
      return { ...a, myReaction, reactionCounts: counts };
    }));
    await fetch(`/api/announcements/${ann.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    fetch_();
  }

  async function comment(ann: Announcement, content: string) {
    if (!content.trim()) return;
    await fetch(`/api/announcements/${ann.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
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
            <p className="text-sm text-gray-500">Đăng bài, nhân viên thả cảm xúc &amp; bình luận</p>
          </div>
        </div>
        <button
          onClick={() => setForm({ title: "", content: "", type: "info", pinned: false, images: [] })}
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-orange-600 transition-colors"
        >
          <Plus size={14} /> Đăng bài
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-16">Đang tải...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-gray-400">Chưa có bài đăng nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((ann) => {
            const cfg = TYPE_CONFIG[ann.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
            return (
              <div key={ann.id} className={`bg-white rounded-2xl border ${cfg.border} p-5 ${ann.pinned ? "ring-2 ring-orange-200" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {ann.pinned && <Pin size={12} className="text-orange-500 shrink-0" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      <h3 className="font-semibold text-gray-800">{ann.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{renderContent(ann.content)}</p>

                    {ann.images.length > 0 && (
                      <div className={`grid gap-1.5 mt-3 ${ann.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {ann.images.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className="w-full max-h-96 object-cover rounded-xl border border-gray-100" />
                        ))}
                      </div>
                    )}

                    {ann.videoUrl && (
                      <video src={ann.videoUrl} controls className="w-full max-h-96 rounded-xl border border-gray-100 mt-3 bg-black" />
                    )}

                    {ann.linkPreview && <LinkCard preview={ann.linkPreview} />}

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

                <ReactionBar ann={ann} onReact={(e) => react(ann, e)} />
                <CommentSection ann={ann} onComment={(c) => comment(ann, c)} />
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{form.id ? "Chỉnh sửa bài đăng" : "Đăng bài mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                <div className="flex gap-2">
                  {(["info", "warning", "urgent"] as const).map((t) => (
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
                <input type="text" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" placeholder="VD: Nghỉ lễ 2/9 năm nay" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung * <span className="text-gray-400 font-normal">(gõ #hashtag nếu muốn gắn thẻ)</span></label>
                <textarea rows={4} value={form.content || ""} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none" placeholder="Nội dung bài đăng... #thongbao" />
              </div>

              {/* Ảnh */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button type="button" onClick={() => imgInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
                    <ImageIcon size={14} /> Thêm ảnh
                  </button>
                  <button type="button" onClick={() => vidInputRef.current?.click()} disabled={uploading || Boolean(form.videoUrl)} className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
                    <Video size={14} /> Thêm video
                  </button>
                  {uploading && <Loader2 size={16} className="animate-spin text-orange-500" />}
                </div>
                <input ref={imgInputRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
                <input ref={vidInputRef} type="file" accept="video/*" hidden onChange={onPickVideo} />
                {form.images && form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.images.map((src, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                        <button type="button" onClick={() => setForm({ ...form, images: form.images!.filter((_, j) => j !== i) })} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {form.videoUrl && (
                  <div className="relative mt-2 w-40">
                    <video src={form.videoUrl} className="w-full rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setForm({ ...form, videoUrl: null })} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Link2 size={13} /> Dán link (YouTube/TikTok/bài viết)</label>
                {form.linkPreview ? (
                  <div className="relative">
                    <LinkCard preview={form.linkPreview} />
                    <button type="button" onClick={() => setForm({ ...form, linkUrl: null, linkPreview: null })} className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5">
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="url" value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} placeholder="https://..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                    <button type="button" onClick={attachLink} disabled={linkLoading || !linkDraft.trim()} className="text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                      {linkLoading ? <Loader2 size={14} className="animate-spin" /> : "Xem trước"}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hết hạn (tùy chọn)</label>
                <input type="date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(form.pinned)} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Ghim lên đầu bảng tin</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setForm(null); setLinkDraft(""); }} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={save} disabled={saving || uploading || !form.title || !form.content} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm hover:bg-orange-600 disabled:opacity-60">
                {saving ? "Đang đăng..." : form.id ? "Cập nhật" : "Đăng bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// RegExp(string) thay vì literal /…/u — literal bị TS1501 chặn khi tsconfig chưa set target ES6+.
const HASHTAG_SPLIT_RE = new RegExp("(#[\\p{L}\\p{N}_]+)", "gu");
function renderContent(text: string) {
  // Tô màu #hashtag trong nội dung khi hiển thị (không đổi dữ liệu gốc).
  const parts = text.split(HASHTAG_SPLIT_RE);
  return parts.map((p, i) =>
    p.startsWith("#") ? <span key={i} className="text-orange-600 font-medium">{p}</span> : p
  );
}

function LinkCard({ preview }: { preview: LinkPreview }) {
  if (preview.embedUrl && (preview.provider === "youtube")) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
        <div className="aspect-video">
          <iframe src={preview.embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <div className="p-2.5 bg-gray-50">
          <p className="text-sm font-medium text-gray-800 line-clamp-1">{preview.title}</p>
        </div>
      </div>
    );
  }
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex gap-3 border border-gray-100 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors">
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="w-24 h-24 object-cover shrink-0" />
      )}
      <div className="py-2 pr-3 min-w-0 flex-1">
        <p className="text-xs text-gray-400 uppercase">{preview.provider}</p>
        <p className="text-sm font-medium text-gray-800 line-clamp-2">{preview.title}</p>
        {preview.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{preview.description}</p>}
      </div>
    </a>
  );
}

function ReactionBar({ ann, onReact }: { ann: Announcement; onReact: (e: ReactionKey) => void }) {
  const total = Object.values(ann.reactionCounts).reduce((s, n) => s + (n || 0), 0);
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
      <div className="flex items-center gap-0.5">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            onClick={() => onReact(r.key)}
            title={r.label}
            className={`text-base px-1.5 py-1 rounded-lg transition-transform hover:scale-125 ${ann.myReaction === r.key ? "bg-orange-50 ring-1 ring-orange-200" : ""}`}
          >
            {r.emoji}
          </button>
        ))}
        {total > 0 && <span className="text-xs text-gray-400 ml-1">{total}</span>}
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <MessageCircle size={13} /> {ann.comments.length}
      </div>
    </div>
  );
}

function CommentSection({ ann, onComment }: { ann: Announcement; onComment: (content: string) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const visible = open ? ann.comments : ann.comments.slice(-2);
  return (
    <div className="mt-2">
      {ann.comments.length > 2 && !open && (
        <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 mb-1.5">
          Xem tất cả {ann.comments.length} bình luận
        </button>
      )}
      <div className="space-y-1.5">
        {visible.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0">
              {c.authorName.slice(0, 1).toUpperCase()}
            </div>
            <div className="bg-gray-50 rounded-2xl px-3 py-1.5 min-w-0">
              <span className="font-medium text-gray-700 text-xs">{c.authorName}</span>
              <p className="text-gray-600 break-words">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onComment(text); setText(""); } }}
        className="flex items-center gap-2 mt-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết bình luận..."
          className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:ring-2 focus:ring-orange-300 outline-none"
        />
        <button type="submit" disabled={!text.trim()} className="text-orange-500 disabled:text-gray-300 p-1.5">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
