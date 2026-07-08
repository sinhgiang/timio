"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Award, Sparkles, TrendingUp } from "lucide-react";

interface Stats { vScore: number | null; vAttendance: number | null; vPunctuality: number | null; vTenureMonths: number | null; }
interface Dev { vDevScore: number | null; vDevTrend: "up" | "flat" | "down" | null; vPromotions: number; vReviewCount: number; timeline: { period: string; score: number }[]; }
interface Initial { desiredTitle: string; desiredArea: string; desiredSalaryMin: number | null; desiredSalaryMax: number | null; skills: string; bio: string; showAvatar: boolean; }

interface Interest { id: string; companyName: string; jobTitle: string | null; message: string | null; }

export default function TalentOptInClient({
  token, name, companyName, stats, dev, interests, alreadyIn, initial,
}: {
  token: string; name: string; companyName: string; stats: Stats; dev: Dev; interests: Interest[]; alreadyIn: boolean; initial: Initial;
}) {
  const [interestList, setInterestList] = useState<Interest[]>(interests);
  const [respondBusy, setRespondBusy] = useState<string | null>(null);
  const [respondMsg, setRespondMsg] = useState<Record<string, string>>({});
  const [copiedShare, setCopiedShare] = useState(false);

  async function respondInterest(id: string, action: "accept" | "decline") {
    setRespondBusy(id);
    try {
      const res = await fetch("/api/talent/interest-respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, interestId: id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setRespondMsg((m) => ({ ...m, [id]: action === "accept" ? "accepted" : "declined" }));
        setTimeout(() => setInterestList((l) => l.filter((x) => x.id !== id)), 1600);
      }
    } catch { /* noop */ }
    setRespondBusy(null);
  }
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

          {/* Chia sẻ hồ sơ xác thực */}
          <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-left">
            <p className="text-sm font-semibold text-blue-800 mb-1 flex items-center gap-1.5"><Sparkles size={14} /> Hồ sơ xác thực của bạn</p>
            <p className="text-xs text-gray-600 mb-2">Chia sẻ link này khi xin việc — nó chứng minh bạn đi làm đúng giờ, chuyên cần bằng dữ liệu thật (không phải tự khai).</p>
            <div className="flex gap-2">
              <a href={`/hoso/${token}`} target="_blank" rel="noreferrer" className="flex-1 text-center bg-blue-600 text-white text-sm rounded-lg py-2 hover:bg-blue-700">Xem hồ sơ</a>
              <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/hoso/${token}`).catch(() => {}); setCopiedShare(true); setTimeout(() => setCopiedShare(false), 2000); }} className="flex-1 border border-blue-200 text-blue-700 text-sm rounded-lg py-2 hover:bg-blue-100">{copiedShare ? "Đã chép ✓" : "Chép link"}</button>
            </div>
          </div>

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

        {/* Nhà tuyển dụng quan tâm — double opt-in */}
        {interestList.length > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-800 mb-2">🔔 {interestList.length} nhà tuyển dụng đang quan tâm bạn</p>
            <div className="space-y-2">
              {interestList.map((it) => (
                <div key={it.id} className="bg-white rounded-xl border border-amber-100 p-3">
                  <p className="text-sm font-semibold text-gray-800">{it.companyName}{it.jobTitle ? <span className="font-normal text-gray-500"> · {it.jobTitle}</span> : null}</p>
                  {it.message && <p className="text-xs text-gray-600 mt-1">“{it.message}”</p>}
                  {respondMsg[it.id] ? (
                    <p className={`text-xs mt-2 font-medium ${respondMsg[it.id] === "accepted" ? "text-green-600" : "text-gray-500"}`}>
                      {respondMsg[it.id] === "accepted" ? "✓ Đã đồng ý — nhà tuyển dụng sẽ liên hệ bạn." : "Đã từ chối."}
                    </p>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => respondInterest(it.id, "accept")} disabled={respondBusy === it.id} className="flex-1 bg-green-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-green-700 disabled:opacity-60">Đồng ý liên hệ</button>
                      <button onClick={() => respondInterest(it.id, "decline")} disabled={respondBusy === it.id} className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 disabled:opacity-60">Từ chối</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 mt-2">Chỉ khi bạn <b>Đồng ý</b>, nhà tuyển dụng mới thấy tên + liên hệ của bạn.</p>
          </div>
        )}

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

        {/* Điểm phát triển */}
        {dev.vDevScore != null && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                <span className="text-sm font-semibold text-gray-800">Điểm phát triển</span>
              </div>
              <span className={`text-lg font-extrabold ${dev.vDevScore >= 70 ? "text-emerald-600" : dev.vDevScore >= 40 ? "text-amber-600" : "text-gray-500"}`}>{dev.vDevScore}/100</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {dev.vDevTrend && (
                <span className={`inline-flex items-center gap-1 font-medium ${dev.vDevTrend === "up" ? "text-emerald-600" : dev.vDevTrend === "down" ? "text-red-500" : "text-gray-500"}`}>
                  {dev.vDevTrend === "up" ? "📈 Đang đi lên" : dev.vDevTrend === "down" ? "📉 Đi xuống" : "➡️ Ổn định"}
                </span>
              )}
              {dev.vPromotions > 0 && <span className="text-emerald-600 font-medium">🏅 Thăng chức {dev.vPromotions} lần</span>}
              {dev.vReviewCount > 0 && <span>{dev.vReviewCount} kỳ đánh giá</span>}
            </div>
            {/* Lộ trình bậc thang */}
            {dev.timeline.length > 1 && (
              <div className="flex items-end gap-1 mt-3 h-14">
                {dev.timeline.slice(-8).map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${t.period}: ${t.score}/100`}>
                    <div className="w-full rounded-t bg-emerald-400" style={{ height: `${Math.max(8, t.score)}%` }} />
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-2">Tổng hợp từ đánh giá hàng tháng của quản lý + thăng tiến tại công ty cũ (ẩn danh — không nêu tên công ty).</p>
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
