"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  Megaphone, Plus, Pin, Pencil, Trash2, AlertTriangle, Info, Zap,
  Image as ImageIcon, Video, Link2, X, Loader2, Send, MessageCircle, User, Share2,
} from "lucide-react";

type LinkPreview = { title: string; description: string; image: string | null; embedUrl: string | null; provider: string; url: string };
// employeeId: null nếu người bình luận là admin/quản lý (không có hồ sơ nhân viên để mở) hoặc
// là nhân viên đã rời công ty/không map được — component tự ẩn link khi employeeId rỗng.
type Comment = { id: string; content: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; actorType: string; employeeId: string | null };
type Reactor = { emoji: ReactionKey; authorName: string; employeeId: string | null };
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
  reactors: Reactor[];
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

const CONTENT_MIN_H = 96;
const CONTENT_MAX_H = 400;

// Tự cao theo nội dung, không thấp hơn `floor` (sàn do chị tự kéo tay), cuộn khi vượt CONTENT_MAX_H.
function autoGrow(el: HTMLTextAreaElement, floor: number) {
  el.style.height = "auto";
  const needed = el.scrollHeight;
  const target = Math.min(Math.max(needed, floor, CONTENT_MIN_H), CONTENT_MAX_H);
  el.style.height = `${target}px`;
  el.style.overflowY = needed > CONTENT_MAX_H ? "auto" : "hidden";
}

export default function AnnouncementsClient() {
  const router = useRouter();
  // Bấm tên người đã thích/bình luận (nếu là nhân viên, có hồ sơ) → mở hồ sơ nhân viên đó
  // kiểu Facebook. Trang Nhân viên tự đọc ?open= rồi mở modal hồ sơ (xem EmployeesClient.tsx).
  const openProfile = useCallback((employeeId: string) => {
    router.push(`/dashboard/employees?open=${employeeId}`);
  }, [router]);
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const manualHeightRef = useRef(0); // sàn chiều cao nếu chị tự kéo tay to hơn — gõ tiếp không bị tự thu lại
  const isAutoResizingRef = useRef(false);

  // Đổi cỡ ô nội dung theo chữ, đánh dấu "đang tự đổi" để ResizeObserver không tưởng nhầm là chị vừa kéo tay.
  const runAutoGrow = useCallback((el: HTMLTextAreaElement, floor: number) => {
    isAutoResizingRef.current = true;
    autoGrow(el, floor);
    requestAnimationFrame(() => { isAutoResizingRef.current = false; });
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Ô nội dung: tự cao theo chữ khi gõ (đến CONTENT_MAX_H thì mới cuộn), đồng thời kéo tay được
  // (resize-y) — theo dõi lúc chị tự kéo để không tự thu nhỏ lại khi gõ tiếp.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !form) return;
    manualHeightRef.current = 0;
    runAutoGrow(el, 0);
    const ro = new ResizeObserver(() => {
      if (!isAutoResizingRef.current) manualHeightRef.current = el.clientHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(form)]);

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
    try {
      const res = await fetch(`/api/announcements/${ann.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        // Trước đây lỗi bị nuốt im lặng — bấm gửi bình luận không thấy phản hồi gì, tưởng
        // "không comment được". Giờ báo rõ lý do thay vì im lặng thất bại.
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Không gửi được bình luận — thử lại.");
        return;
      }
    } catch {
      alert("Lỗi kết nối — thử lại.");
      return;
    }
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
                          // object-contain + nền xám: hiện trọn ảnh gốc, không cắt mất phần trên/dưới
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className={`w-full ${ann.images.length === 1 ? "max-h-[560px]" : "max-h-80"} object-contain rounded-xl border border-gray-100 bg-gray-50`} />
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

                <SocialSection ann={ann} onReact={(e) => react(ann, e)} onComment={(c) => comment(ann, c)} onOpenProfile={openProfile} />
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
                <textarea
                  ref={contentRef}
                  value={form.content || ""}
                  onChange={(e) => { setForm({ ...form, content: e.target.value }); runAutoGrow(e.target, manualHeightRef.current); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-y"
                  style={{ minHeight: CONTENT_MIN_H, maxHeight: CONTENT_MAX_H }}
                  placeholder="Nội dung bài đăng... #thongbao"
                />
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

// Số người tối đa liệt kê tên trong popover "ai đã thích" — vượt quá thì gộp "và N người khác"
// (giống Facebook không load hết danh sách dài).
const REACTORS_CAP = 20;

// "3 phút", "2 giờ", "hôm qua"... kiểu Facebook — không có helper tương đương sẵn trong codebase.
function timeAgoVi(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} giờ`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} ngày`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week} tuần`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} tháng`;
  return `${Math.floor(day / 365)} năm`;
}

// Gộp thanh cảm xúc + bình luận thành 1 component (thay ReactionBar + CommentSection cũ) — cần
// chung 1 chỗ để nút "Bình luận" vừa mở khung bình luận vừa focus thẳng vào ô nhập (2 việc trên
// state của cùng 1 khối). Layout mô phỏng bố cục Facebook (icon chồng mí, popover "ai đã thích"
// gom theo loại cảm xúc, dải emoji khi hover nút Thích) nhưng GIỮ màu cam thương hiệu Timio —
// theo yêu cầu của chị: chỉ lấy bố cục, không lấy theme tối/màu của Facebook.
function SocialSection({ ann, onReact, onComment, onOpenProfile }: { ann: Announcement; onReact: (e: ReactionKey) => void; onComment: (content: string) => void; onOpenProfile: (employeeId: string) => void }) {
  const total = Object.values(ann.reactionCounts).reduce((s, n) => s + (n || 0), 0);
  const [showWho, setShowWho] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [text, setText] = useState("");
  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (pickerTimer.current) clearTimeout(pickerTimer.current); }, []);

  const myReactionInfo = ann.myReaction ? REACTIONS.find((r) => r.key === ann.myReaction) : null;

  // Icon nổi bật trên thanh tổng hợp: emoji có nhiều người thả nhất trước, tối đa 3 (kiểu Facebook).
  const topEmojis = Object.entries(ann.reactionCounts)
    .filter(([, n]) => (n || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 3)
    .map(([key]) => REACTIONS.find((r) => r.key === key)?.emoji);

  // Gom người đã thả cảm xúc theo loại emoji (mỗi loại 1 nhóm có tiêu đề đậm), giới hạn hiển thị
  // tên ở REACTORS_CAP người rồi gộp phần dư thành "và N người khác".
  const groups = REACTIONS.map((r) => ({ ...r, people: ann.reactors.filter((x) => x.emoji === r.key) })).filter((g) => g.people.length > 0);
  let shownCount = 0;
  const overflow = Math.max(0, total - REACTORS_CAP);

  function focusComment() {
    setCommentsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function openPicker() {
    if (pickerTimer.current) clearTimeout(pickerTimer.current);
    setShowPicker(true);
  }
  function closePickerDelayed() {
    pickerTimer.current = setTimeout(() => setShowPicker(false), 250);
  }

  const visibleComments = commentsOpen ? ann.comments : ann.comments.slice(-2);

  // "Chia sẻ" — bài đăng là nội bộ (phải đăng nhập mới xem), không có link công khai để dán URL
  // vào nút chia sẻ riêng của Facebook/Zalo. Dùng Web Share API của trình duyệt/thiết bị: bấm vào
  // sẽ mở đúng bảng chia sẻ hệ thống, nếu máy có cài Zalo/Facebook/Instagram/TikTok thì các app đó
  // tự hiện ra để chọn gửi nội dung (kèm ảnh đầu bài nếu trình duyệt hỗ trợ đính kèm file).
  async function shareAnnouncement() {
    const text = `${ann.title}\n\n${ann.content}`.trim();
    const shareData: ShareData = { title: ann.title, text };

    if (ann.images[0] && typeof navigator.canShare === "function") {
      try {
        const res = await fetch(ann.images[0]);
        const blob = await res.blob();
        const file = new File([blob], "anh-bai-dang.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [file] })) shareData.files = [file];
      } catch {
        // Không lấy được ảnh (mạng, CORS...) — vẫn chia sẻ được nội dung chữ, bỏ qua ảnh.
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return; // chị tự đóng bảng chia sẻ
        if (shareData.files) {
          // Một số trình duyệt kén định dạng file khi chia sẻ — thử lại chỉ với nội dung chữ.
          try { await navigator.share({ title: ann.title, text }); } catch { /* bỏ qua */ }
        }
      }
      return;
    }

    // Trình duyệt (thường là máy tính) chưa hỗ trợ Web Share API — sao chép nội dung để dán tay.
    try {
      await navigator.clipboard.writeText(text);
      alert("Trình duyệt này chưa có bảng chia sẻ — đã sao chép nội dung bài đăng, dán vào Zalo/Facebook/Instagram để chia sẻ.");
    } catch {
      alert("Không chia sẻ được trên trình duyệt này.");
    }
  }

  return (
    <div className="mt-3">
      {/* Thanh tổng hợp: icon cảm xúc chồng mí + tổng số (bấm xem ai đã thích), số bình luận bên phải */}
      {(total > 0 || ann.comments.length > 0) && (
        <div className="relative flex items-center justify-between pb-2 text-xs text-gray-500">
          {total > 0 ? (
            <button onClick={() => setShowWho((v) => !v)} className="flex items-center gap-1.5 hover:underline">
              <span className="flex items-center">
                {topEmojis.map((e, i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-full bg-white border border-white shadow flex items-center justify-center text-[10px] leading-none"
                    style={{ marginLeft: i === 0 ? 0 : -6, zIndex: (topEmojis.length || 0) - i }}
                  >
                    {e}
                  </span>
                ))}
              </span>
              <span>{total}</span>
            </button>
          ) : <span />}
          {ann.comments.length > 0 && (
            <button onClick={focusComment} className="hover:underline">{ann.comments.length} bình luận</button>
          )}

          {/* "Ai đã thích" — gom theo loại emoji, có tiêu đề đậm từng nhóm + đuôi tam giác trỏ lên thanh tổng hợp */}
          {showWho && (
            <>
              <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowWho(false)} aria-label="Đóng" />
              <div className="absolute left-0 top-full z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-2 px-3 min-w-[200px] max-w-[260px] max-h-64 overflow-y-auto">
                <div className="absolute -top-1 left-4 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45" />
                {groups.map((g) => {
                  const remain = REACTORS_CAP - shownCount;
                  const people = g.people.slice(0, Math.max(0, remain));
                  shownCount += g.people.length;
                  if (people.length === 0) return null;
                  return (
                    <div key={g.key} className="mb-2 last:mb-0">
                      <p className="text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                        <span>{g.emoji}</span> {g.label}
                      </p>
                      <div className="space-y-1">
                        {people.map((p, i) =>
                          p.employeeId ? (
                            <button key={i} onClick={() => { onOpenProfile(p.employeeId!); setShowWho(false); }} className="block text-sm text-gray-700 hover:text-blue-600 hover:underline truncate text-left">
                              {p.authorName}
                            </button>
                          ) : (
                            <p key={i} className="text-sm text-gray-700 truncate">{p.authorName}</p>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
                {overflow > 0 && <p className="text-xs text-gray-400 mt-1">và {overflow} người khác</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* Hàng nút hành động kiểu Facebook: Thích (hover/giữ hiện dải 6 emoji) / Bình luận */}
      <div className="flex items-center border-t border-gray-50 pt-0.5">
        <div className="relative flex-1" onMouseEnter={openPicker} onMouseLeave={closePickerDelayed}>
          {showPicker && (
            <div
              className="absolute bottom-full left-0 mb-1 flex items-center gap-0.5 bg-white rounded-full border border-gray-200 shadow-lg px-1.5 py-1 z-20"
              onMouseEnter={openPicker}
              onMouseLeave={closePickerDelayed}
            >
              {REACTIONS.map((r) => (
                <button key={r.key} title={r.label} onClick={() => { onReact(r.key); setShowPicker(false); }} className="text-2xl px-1 hover:scale-125 transition-transform">
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => onReact(ann.myReaction || "like")}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 ${myReactionInfo ? "text-orange-600" : "text-gray-500"}`}
          >
            <span className="text-base leading-none">{myReactionInfo?.emoji || "👍"}</span>
            {myReactionInfo?.label || "Thích"}
          </button>
        </div>
        <button onClick={focusComment} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <MessageCircle size={15} /> Bình luận
        </button>
        <button onClick={shareAnnouncement} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <Share2 size={15} /> Chia sẻ
        </button>
      </div>

      {/* Bình luận */}
      <div className="mt-2">
        {ann.comments.length > 2 && !commentsOpen && (
          <button onClick={() => setCommentsOpen(true)} className="text-xs text-gray-400 hover:text-gray-600 mb-1.5">
            Xem tất cả {ann.comments.length} bình luận
          </button>
        )}
        <div className="space-y-2">
          {visibleComments.map((c) => {
            // Bấm avatar/tên để xem hồ sơ — chỉ khi map được về 1 nhân viên (admin/quản lý bình
            // luận thì không có hồ sơ nhân viên riêng nên giữ dạng chữ thường, không bấm được).
            const clickable = Boolean(c.employeeId);
            const initial = c.authorName.slice(0, 1).toUpperCase();
            const avatar = c.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.authorAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-500 shrink-0">
                {initial}
              </div>
            );
            return (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                {clickable ? (
                  <button onClick={() => onOpenProfile(c.employeeId!)} className="rounded-full shrink-0 hover:ring-2 hover:ring-orange-300">
                    {avatar}
                  </button>
                ) : avatar}
                <div className="min-w-0">
                  <div className="bg-gray-50 rounded-2xl px-3 py-1.5 inline-block max-w-full">
                    {clickable ? (
                      <button onClick={() => onOpenProfile(c.employeeId!)} className="block font-medium text-gray-700 text-xs hover:text-blue-600 hover:underline">
                        {c.authorName}
                      </button>
                    ) : (
                      <span className="block font-medium text-gray-700 text-xs">{c.authorName}</span>
                    )}
                    <p className="text-gray-600 break-words">{c.content}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 ml-3">{timeAgoVi(c.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onComment(text); setText(""); } }}
          className="flex items-center gap-2 mt-2"
        >
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <User size={14} className="text-gray-400" strokeWidth={1.5} />
          </div>
          <input
            ref={inputRef}
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
    </div>
  );
}
