"use client";

import { useState } from "react";
import { X, MessageCircle, Mail, ClipboardList, ArrowLeft, CheckCircle2 } from "lucide-react";

const ZALO_LINK = process.env.NEXT_PUBLIC_SUPPORT_ZALO; // vd: https://zalo.me/84xxxxxxxxx
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "admin@sinhgiang.com";

export default function ContactSupport({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"menu" | "ticket" | "sent">("menu");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  async function submitTicket() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không gửi được ticket");
      setSentMessage(data.message);
      setView("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được ticket");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="absolute inset-0 bg-black/30 z-10 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl p-5 max-h-[85%] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "menu" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Hỗ trợ từ Timio</h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Đóng">
                <X className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              AI không giải quyết được vấn đề của bạn? Liên hệ trực tiếp team Timio:
            </p>
            <div className="space-y-2.5">
              {ZALO_LINK && (
                <a
                  href={ZALO_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Zalo</p>
                    <p className="text-xs text-gray-500">Phản hồi nhanh nhất trong giờ làm việc</p>
                  </div>
                </a>
              )}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Timio] Cần hỗ trợ")}`}
                className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/50"
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Email</p>
                  <p className="text-xs text-gray-500">{SUPPORT_EMAIL}</p>
                </div>
              </a>
              <button
                onClick={() => setView("ticket")}
                className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/50 text-left"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">Tạo ticket hỗ trợ</p>
                  <p className="text-xs text-gray-500">Theo dõi được tiến độ, phản hồi qua email</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">Giờ hỗ trợ: 8h–18h, Thứ 2 – Thứ 7</p>
          </>
        )}

        {view === "ticket" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setView("menu")} className="p-1.5 rounded-full hover:bg-gray-100" aria-label="Quay lại">
                <ArrowLeft className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
              </button>
              <h3 className="font-bold text-gray-900">Tạo ticket hỗ trợ</h3>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="vd: Không xuất được báo cáo Excel"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mô tả vấn đề bạn gặp phải, các bước đã thử..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mức độ</label>
            <div className="flex gap-2 mb-4">
              {[
                { key: "urgent", label: "🔴 Khẩn" },
                { key: "normal", label: "🟡 Bình thường" },
                { key: "low", label: "🟢 Thấp" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${
                    priority === p.key ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <button
              onClick={submitTicket}
              disabled={sending || title.trim().length < 5 || description.trim().length < 10}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? "Đang gửi..." : "Gửi ticket"}
            </button>
          </>
        )}

        {view === "sent" && (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Đã gửi ticket!</h3>
            <p className="text-sm text-gray-500 mb-5">{sentMessage}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
