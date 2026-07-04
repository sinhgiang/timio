"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, Send, MessageCircle, Plus, X, Clock } from "lucide-react";

interface Channels { email: boolean; telegram: boolean; zalo: boolean; }
interface ReminderConfig {
  enabled: boolean;
  channels: Channels;
  times: number[];
  days: number[];
  target: "absent_today" | "all";
  subject: string;
  message: string;
}

const DEFAULT: ReminderConfig = {
  enabled: false,
  channels: { email: true, telegram: true, zalo: false },
  times: [8],
  days: [1, 2, 3, 4, 5, 6],
  target: "absent_today",
  subject: "Nhắc chấm công",
  message: "Kính gửi các bạn, vui lòng check-in chấm công đúng giờ hôm nay. Cảm ơn!",
};

// Thứ theo quy ước VN: CN=0
const DAYS: { v: number; label: string }[] = [
  { v: 1, label: "T2" }, { v: 2, label: "T3" }, { v: 3, label: "T4" },
  { v: 4, label: "T5" }, { v: 5, label: "T6" }, { v: 6, label: "T7" }, { v: 0, label: "CN" },
];

export default function AutoReminderPanel({ zaloConnected }: { zaloConnected: boolean }) {
  const [cfg, setCfg] = useState<ReminderConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company/auto-reminder")
      .then((r) => r.json())
      .then((d) => { if (d.config) setCfg(d.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const patch = (p: Partial<ReminderConfig>) => setCfg((c) => ({ ...c, ...p }));
  const toggleChannel = (k: keyof Channels) => setCfg((c) => ({ ...c, channels: { ...c.channels, [k]: !c.channels[k] } }));
  const toggleDay = (v: number) =>
    setCfg((c) => ({ ...c, days: c.days.includes(v) ? c.days.filter((d) => d !== v) : [...c.days, v].sort((a, b) => a - b) }));

  const setTime = (idx: number, val: number) =>
    setCfg((c) => { const t = [...c.times]; t[idx] = val; return { ...c, times: t }; });
  const addTime = () => setCfg((c) => (c.times.length >= 2 ? c : { ...c, times: [...c.times, 18] }));
  const removeTime = (idx: number) => setCfg((c) => ({ ...c, times: c.times.filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch("/api/company/auto-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: cfg }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { if (data.config) setCfg(data.config); setMsg("✅ Đã lưu cài đặt nhắc tự động."); }
    else setMsg(`❌ ${data.error ?? "Lưu thất bại"}`);
  };

  if (loading) {
    return <div className="mt-8 border-t border-gray-100 pt-6 text-sm text-gray-400">Đang tải cài đặt nhắc tự động…</div>;
  }

  const chip = (active: boolean, extra = "") =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
      active ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-400"
    } ${extra}`;

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={20} className="text-blue-500" />
        <h2 className="text-base font-bold text-gray-800">Nhắc chấm công tự động hàng ngày</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Hệ thống tự động gửi tin nhắc chấm công cho nhân viên theo giờ và ngày bạn chọn.
        Email và Telegram miễn phí; Zalo cần công ty đã kết nối OA trả phí.
      </p>

      {/* Master toggle */}
      <label className="flex items-center gap-3 mb-5 cursor-pointer select-none">
        <span
          onClick={() => patch({ enabled: !cfg.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cfg.enabled ? "bg-blue-600" : "bg-gray-300"}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cfg.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </span>
        <span className="text-sm font-semibold text-gray-700">{cfg.enabled ? "Đang BẬT — sẽ tự gửi" : "Đang TẮT"}</span>
      </label>

      {cfg.enabled && (
        <div className="space-y-6 max-w-xl">
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
                {" "}Chưa trả phí thì Email/Telegram vẫn gửi bình thường.
              </p>
            )}
          </div>

          {/* Target */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gửi cho ai</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => patch({ target: "absent_today" })} className={chip(cfg.target === "absent_today")}>
                Chỉ người chưa chấm công
              </button>
              <button onClick={() => patch({ target: "all" })} className={chip(cfg.target === "all")}>
                Tất cả nhân viên
              </button>
            </div>
          </div>

          {/* Times */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Giờ gửi (tối đa 2 lần/ngày)</p>
            <div className="flex flex-wrap items-center gap-2">
              {cfg.times.map((t, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1 py-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={t}
                    onChange={(e) => setTime(i, Number(e.target.value))}
                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                  {cfg.times.length > 1 && (
                    <button onClick={() => removeTime(i)} className="text-gray-400 hover:text-red-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              {cfg.times.length < 2 && (
                <button onClick={addTime} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50">
                  <Plus className="w-3.5 h-3.5" /> Thêm giờ
                </button>
              )}
            </div>
          </div>

          {/* Days */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ngày gửi (bỏ tick ngày nghỉ)</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = cfg.days.includes(d.v);
                return (
                  <button
                    key={d.v}
                    onClick={() => toggleDay(d.v)}
                    className={`w-11 h-9 rounded-lg text-xs font-bold border transition-colors ${
                      active ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nội dung tin nhắn</p>
            <input
              value={cfg.subject}
              onChange={(e) => patch({ subject: e.target.value })}
              placeholder="Tiêu đề email (vd: Nhắc chấm công)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <textarea
              value={cfg.message}
              onChange={(e) => patch({ message: e.target.value })}
              rows={3}
              placeholder="Nội dung nhắc nhở gửi cho nhân viên"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
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
