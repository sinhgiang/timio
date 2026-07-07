"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Award, Sparkles } from "lucide-react";

interface Stats { vScore: number | null; vAttendance: number | null; vPunctuality: number | null; vTenureMonths: number | null; }
interface Initial { desiredTitle: string; desiredArea: string; desiredSalaryMin: number | null; desiredSalaryMax: number | null; skills: string; bio: string; showAvatar: boolean; }

export default function TalentOptInClient({
  token, name, companyName, stats, alreadyIn, initial,
}: {
  token: string; name: string; companyName: string; stats: Stats; alreadyIn: boolean; initial: Initial;
}) {
  const [f, setF] = useState({
    desiredTitle: initial.desiredTitle, desiredArea: initial.desiredArea,
    desiredSalaryMin: initial.desiredSalaryMin ? String(initial.desiredSalaryMin) : "",
    desiredSalaryMax: initial.desiredSalaryMax ? String(initial.desiredSalaryMax) : "",
    skills: initial.skills, bio: initial.bio, showAvatar: initial.showAvatar,
  });
  const [consent, setConsent] = useState(alreadyIn);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit() {
    setError(null);
    if (!consent) { setError("Vui lòng đồng ý điều khoản để tham gia."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/talent/opt-in", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, consent: true,
          desiredTitle: f.desiredTitle || null, desiredArea: f.desiredArea || null,
          desiredSalaryMin: f.desiredSalaryMin ? Number(f.desiredSalaryMin) : null,
          desiredSalaryMax: f.desiredSalaryMax ? Number(f.desiredSalaryMax) : null,
          skills: f.skills || null, bio: f.bio || null, showAvatar: f.showAvatar,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "Không lưu được."); setSaving(false); return; }
      setDone(true);
    } catch { setError("Lỗi kết nối."); }
    setSaving(false);
  }

  async function optOut() {
    setSaving(true);
    try {
      await fetch("/api/talent/opt-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "opt_out" }) });
      setOptedOut(true);
    } catch { /* noop */ }
    setSaving(false);
  }

  const input = "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none";
  const label = "block text-sm font-medium text-gray-700 mb-1";

  if (optedOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md">
          <CheckCircle2 size={44} className="text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-gray-800">Đã gỡ hồ sơ khỏi cộng đồng</h1>
          <p className="text-sm text-gray-500 mt-2">Bạn có thể quay lại bất cứ lúc nào qua link này.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={30} className="text-green-600" /></div>
          <h1 className="text-xl font-bold text-gray-800">Hoàn tất! 🎉</h1>
          <p className="text-sm text-gray-600 mt-2">Hồ sơ của bạn đã vào cộng đồng ứng viên Timio. Khi có công việc tốt phù hợp, Timio sẽ giới thiệu cho bạn — và nhà tuyển dụng chỉ liên hệ được khi <b>bạn đồng ý</b>.</p>
          <button onClick={optOut} className="mt-5 text-xs text-gray-400 underline">Gỡ hồ sơ khỏi cộng đồng</button>
        </div>
      </div>
    );
  }

  const hasStats = stats.vScore != null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center"><Sparkles size={18} className="text-white" strokeWidth={1.5} /></div>
          <div><p className="text-xs text-blue-600 font-medium">Cộng đồng ứng viên Timio</p><h1 className="text-base font-bold text-gray-800">Hồ sơ tìm việc của bạn</h1></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">Chào {name}!</h2>
          <p className="text-sm text-gray-600 mt-1">Cảm ơn bạn đã đồng hành cùng {companyName}. Hoàn thiện hồ sơ để Timio giới thiệu công việc tốt cho bạn — <b>miễn phí</b>.</p>
        </div>

        {/* Huy hiệu xác thực */}
        {hasStats && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck size={18} /> <span className="text-sm font-semibold">Hồ sơ xác thực bởi Timio</span></div>
            <div className="flex items-end gap-3">
              <div className="text-center bg-white/15 rounded-xl px-4 py-2">
                <p className="text-3xl font-extrabold leading-none">{stats.vScore}</p>
                <p className="text-[11px] text-blue-100 mt-1">Điểm tin cậy</p>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs">
                <div><p className="font-bold text-base">{stats.vAttendance}%</p><p className="text-blue-100">Chuyên cần</p></div>
                <div><p className="font-bold text-base">{stats.vPunctuality}%</p><p className="text-blue-100">Đúng giờ</p></div>
                <div><p className="font-bold text-base">{stats.vTenureMonths ?? "—"}</p><p className="text-blue-100">Tháng</p></div>
              </div>
            </div>
            <p className="text-[11px] text-blue-100 mt-2 flex items-center gap-1"><Award size={12} /> Số liệu thật từ dữ liệu chấm công — nhà tuyển dụng tin tưởng hơn CV tự khai.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Vị trí mong muốn</label><input className={input} value={f.desiredTitle} onChange={(e) => set("desiredTitle", e.target.value)} placeholder="VD: Phục vụ, Kế toán..." /></div>
            <div><label className={label}>Khu vực</label><input className={input} value={f.desiredArea} onChange={(e) => set("desiredArea", e.target.value)} placeholder="VD: Hà Nội, HCM..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Lương mong muốn từ (₫)</label><input type="number" className={input} value={f.desiredSalaryMin} onChange={(e) => set("desiredSalaryMin", e.target.value)} placeholder="VD: 7000000" /></div>
            <div><label className={label}>Đến (₫)</label><input type="number" className={input} value={f.desiredSalaryMax} onChange={(e) => set("desiredSalaryMax", e.target.value)} placeholder="VD: 12000000" /></div>
          </div>
          <div><label className={label}>Kỹ năng / kinh nghiệm</label><textarea rows={3} className={`${input} resize-none`} value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Mỗi ý một dòng..." /></div>
          <div>
            <label className={label}>Giới thiệu ngắn</label>
            <textarea rows={2} className={`${input} resize-none`} value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Vài dòng về bạn (đừng ghi tên công ty cũ để giữ ẩn danh)..." />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer bg-blue-50 rounded-xl p-3">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-4 h-4 rounded accent-blue-600 mt-0.5" />
            <span className="text-xs text-gray-700 leading-relaxed">
              Tôi đồng ý đưa hồ sơ (ẩn danh) + chỉ số xác thực vào cộng đồng ứng viên Timio. Tôi hiểu <b>công ty cũ không thấy hồ sơ này khi tôi tìm việc</b>, và nhà tuyển dụng chỉ liên hệ được khi <b>tôi đồng ý</b>. Tôi có thể gỡ bất cứ lúc nào.
            </span>
          </label>

          {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700"><AlertTriangle size={16} className="shrink-0 mt-0.5" strokeWidth={1.5} /><span>{error}</span></div>}

          <button onClick={submit} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? <><Loader2 size={18} className="animate-spin" /> Đang lưu...</> : (alreadyIn ? "Cập nhật hồ sơ" : "Tham gia cộng đồng")}
          </button>
          {alreadyIn && <button onClick={optOut} disabled={saving} className="w-full text-xs text-gray-400 underline">Gỡ hồ sơ khỏi cộng đồng</button>}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Vận hành bởi <span className="font-medium text-gray-500">Timio</span></p>
      </main>
    </div>
  );
}
