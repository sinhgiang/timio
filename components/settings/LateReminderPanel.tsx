"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Mail, Send, MessageCircle } from "lucide-react";

interface Channels { email: boolean; telegram: boolean; zalo: boolean; }
interface LateConfig {
  enabled: boolean;
  channels: Channels;
  delayMinutes: number;
  target: "absent_today" | "all";
  message: string;
}

const DEFAULT: LateConfig = {
  enabled: false,
  channels: { email: true, telegram: true, zalo: false },
  delayMinutes: 10,
  target: "absent_today",
  message: "Chào {ten}, đã đến giờ vào ca mà bạn chưa chấm công. Sếp đang đợi — vui lòng check-in ngay. Cảm ơn!",
};

export default function LateReminderPanel({ zaloConnected }: { zaloConnected: boolean }) {
  const [cfg, setCfg] = useState<LateConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company/late-reminder")
      .then((r) => r.json())
      .then((d) => { if (d.config) setCfg(d.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patch = (p: Partial<LateConfig>) => setCfg((c) => ({ ...c, ...p }));
  const toggleChannel = (k: keyof Channels) => setCfg((c) => ({ ...c, channels: { ...c.channels, [k]: !c.channels[k] } }));

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch("/api/company/late-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: cfg }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { if (data.config) setCfg(data.config); setMsg("✅ Đã lưu nhắc trễ theo ca."); }
    else setMsg(`❌ ${data.error ?? "Lưu thất bại"}`);
  };

  if (loading) {
    return <div className="mt-8 border-t border-gray-100 pt-6 text-sm text-gray-400">Đang tải cài đặt nhắc trễ…</div>;
  }

  const chip = (active: boolean) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
      active ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-400"
    }`;

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <AlarmClock size={20} className="text-orange-500" />
        <h2 className="text-base font-bold text-gray-800">Nhắc chấm công trễ theo ca (thông minh)</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Hệ thống tự rà theo <b>giờ vào ca của từng nhân viên</b>. Ai quá giờ vào ca một chút mà vẫn chưa chấm công thì
        được nhắc riêng ngay. Tự bỏ qua người đang nghỉ phép và ngày nghỉ của họ. Mỗi người chỉ bị nhắc 1 lần/ngày.
      </p>

      {/* Master toggle */}
      <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
        <span
          onClick={() => patch({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg.enabled ? "bg-blue-600" : "bg-gray-300"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cfg.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </span>
        <span className="text-sm font-semibold text-gray-700">{cfg.enabled ? "Đang BẬT — sẽ tự nhắc" : "Đang TẮT"}</span>
      </label>

      {cfg.enabled && (
        <div className="space-y-6 max-w-xl">
          {/* Delay */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Thời điểm nhắc</p>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Nhắc sau khi quá giờ vào ca + ân hạn thêm</span>
              <input
                type="number"
                min={0}
                max={120}
                value={cfg.delayMinutes}
                onChange={(e) => patch({ delayMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })}
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span>phút</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              Ví dụ: giờ vào ca 07:30, ân hạn 5 phút, nhắc thêm {cfg.delayMinutes} phút → nhắc lúc khoảng{" "}
              {(() => { const t = 7 * 60 + 30 + 5 + cfg.delayMinutes; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })()}.
              Trên gói miễn phí độ chính xác ~10–20 phút.
            </p>
          </div>

          {/* Channels */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kênh gửi</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggleChannel("email")} className={chip(cfg.channels.email)}>
                <Mail className="w-3.5 h-3.5" /> Email {cfg.channels.email ? "BẬT" : "TẮT"}
              </button>
              <button onClick={() => toggleChannel("telegram")} className={chip(cfg.channels.telegram)}>
                <Send className="w-3.5 h-3.5" /> Telegram {cfg.channels.telegram ? "BẬT" : "TẮT"}
              </button>
              <button onClick={() => toggleChannel("zalo")} className={chip(cfg.channels.zalo)}>
                <MessageCircle className="w-3.5 h-3.5" /> Zalo {cfg.channels.zalo ? "BẬT" : "TẮT"}
              </button>
            </div>
            {cfg.channels.zalo && (
              <p className="text-[11px] text-amber-600 mt-2 leading-relaxed">
                Zalo tự động cần công ty MUA gói OA trả phí + nhân viên đã follow OA.
                {!zaloConnected && <> Chưa kết nối OA — <a href="/dashboard/settings" className="underline">cài đặt Zalo tại đây</a>.</>}
              </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1.5">
              Email &amp; Zalo gửi riêng cho từng người; Telegram đăng danh sách người trễ vào nhóm chi nhánh.
            </p>
          </div>

          {/* Target */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gửi cho ai</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => patch({ target: "absent_today" })} className={chip(cfg.target === "absent_today")}>
                Chỉ người chưa chấm công (khuyến nghị)
              </button>
              <button onClick={() => patch({ target: "all" })} className={chip(cfg.target === "all")}>
                Tất cả nhân viên
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Chế độ này vốn chỉ nhắc người đã quá giờ mà chưa chấm công — nên thực tế luôn ưu tiên nhóm chưa chấm công.
            </p>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nội dung nhắc</p>
            <textarea
              value={cfg.message}
              onChange={(e) => patch({ message: e.target.value })}
              rows={3}
              placeholder="Nội dung nhắc gửi cho nhân viên"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Gõ <code className="bg-gray-100 px-1 rounded">{"{ten}"}</code> để hệ thống tự thay bằng tên nhân viên.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
        {msg && <span className={`text-sm font-medium ${msg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{msg}</span>}
      </div>
    </div>
  );
}
