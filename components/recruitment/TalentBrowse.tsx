"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Search, Loader2, Coins, Heart, CheckCircle2, Phone, Mail, Sparkles, X } from "lucide-react";
import VerifiedBadge from "@/components/recruitment/VerifiedBadge";

type Cand = {
  id: string; maskedName: string; desiredTitle: string | null; desiredArea: string | null;
  desiredSalaryMin: number | null; desiredSalaryMax: number | null; skills: string | null; bio: string | null;
  vScore: number | null; vAttendance: number | null; vPunctuality: number | null; vTenureMonths: number | null;
  vDevScore: number | null; vDevTrend: string | null; vPromotions: number | null; vReviewCount: number | null;
  matchScore?: number; matchReason?: string;
};
type Interest = { id: string; profileId: string; maskedName: string; status: string; message: string | null; createdAt: string; contact: { name: string; phone: string | null; email: string | null } | null };
type Job = { id: string; title: string; status: string };
type Pack = { id: string; credits: number; price: number; label: string };
type TopupInfo = { reference: string; amount: number; credits: number; packLabel: string; qrUrl: string; bankName: string; accountNumber: string; accountName: string; transferNote: string };

const CREDIT_PACKS: Pack[] = [
  { id: "c10", credits: 10, price: 200000, label: "10 lượt" },
  { id: "c30", credits: 30, price: 540000, label: "30 lượt" },
  { id: "c50", credits: 50, price: 850000, label: "50 lượt" },
  { id: "c100", credits: 100, price: 1600000, label: "100 lượt" },
];

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function CandCard({ c, onInterest }: { c: Cand; onInterest: (c: Cand) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-800">{c.maskedName}</p>
          <p className="text-xs text-gray-500">{c.desiredTitle || "—"}{c.desiredArea ? ` · ${c.desiredArea}` : ""}</p>
        </div>
        {typeof c.matchScore === "number" ? (
          <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg ${c.matchScore >= 70 ? "bg-purple-100 text-purple-700" : c.matchScore >= 40 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>Khớp {c.matchScore}%</span>
        ) : (
          <ShieldCheck size={16} className="text-blue-500 shrink-0" strokeWidth={1.8} />
        )}
      </div>
      {c.matchReason && <p className="text-[11px] text-purple-700 bg-purple-50 rounded-md px-2 py-1 mb-2 flex items-start gap-1"><Sparkles size={11} className="mt-0.5 shrink-0" /> {c.matchReason}</p>}
      <div className="mb-2">
        <VerifiedBadge stats={c} mode="compact" />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 mb-2">
        {(c.desiredSalaryMin || c.desiredSalaryMax) && <span>Mong muốn {c.desiredSalaryMin ? (c.desiredSalaryMin / 1_000_000) : "?"}–{c.desiredSalaryMax ? (c.desiredSalaryMax / 1_000_000) : "?"}tr</span>}
      </div>
      {c.skills && <p className="text-xs text-gray-600 line-clamp-2 mb-2">{c.skills}</p>}
      <button onClick={() => onInterest(c)} className="w-full flex items-center justify-center gap-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-purple-700">
        <Heart size={14} /> Quan tâm (mở khóa 1 credit)
      </button>
    </div>
  );
}

export default function TalentBrowse({ role }: { role: string }) {
  const [view, setView] = useState<"browse" | "suggest" | "mine">("browse");
  const [cands, setCands] = useState<Cand[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [viTri, setViTri] = useState("");
  const [khuVuc, setKhuVuc] = useState("");
  const [diemMin, setDiemMin] = useState("");
  const [interestModal, setInterestModal] = useState<Cand | null>(null);
  const [interestMsg, setInterestMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Gợi ý AI
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selJob, setSelJob] = useState("");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggested, setSuggested] = useState<Cand[]>([]);
  const [aiOn, setAiOn] = useState(true);
  // Nạp credit
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupInfo, setTopupInfo] = useState<TopupInfo | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    try { const r = await fetch("/api/recruitment/talent/credit"); const d = await r.json(); setBalance(d.balance ?? 0); } catch { /* noop */ }
  }, []);

  const loadBrowse = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (viTri) q.set("vi_tri", viTri);
      if (khuVuc) q.set("khu_vuc", khuVuc);
      if (diemMin) q.set("diem_min", diemMin);
      const r = await fetch(`/api/recruitment/talent/browse?${q}`);
      if (r.status === 403) { setLocked(true); setLoading(false); return; }
      const d = await r.json();
      setCands(d.candidates || []);
    } catch { /* noop */ }
    setLoading(false);
  }, [viTri, khuVuc, diemMin]);

  const loadInterests = useCallback(async () => {
    try { const r = await fetch("/api/recruitment/talent/interests"); const d = await r.json(); setInterests(d.items || []); } catch { /* noop */ }
  }, []);

  const loadJobs = useCallback(async () => {
    try { const r = await fetch("/api/recruitment/jobs?status=open"); const d = await r.json(); setJobs(Array.isArray(d) ? d : []); } catch { /* noop */ }
  }, []);

  useEffect(() => { loadBalance(); loadBrowse(); loadInterests(); loadJobs(); }, [loadBalance, loadBrowse, loadInterests, loadJobs]);

  const runSuggest = useCallback(async (jobId: string) => {
    if (!jobId) { setSuggested([]); return; }
    setSuggestLoading(true);
    try {
      const r = await fetch(`/api/recruitment/talent/suggest?jobId=${encodeURIComponent(jobId)}`);
      const d = await r.json();
      setSuggested(d.candidates || []);
      setAiOn(d.ai !== false);
    } catch { setSuggested([]); }
    setSuggestLoading(false);
  }, []);

  // Nạp credit qua chuyển khoản (Sepay). Poll trạng thái đơn.
  async function startTopup(packId: string) {
    setTopupLoading(true);
    try {
      const r = await fetch("/api/recruitment/talent/credit/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Không tạo được đơn nạp."); setTopupLoading(false); return; }
      setTopupInfo(d);
    } catch { alert("Lỗi kết nối"); }
    setTopupLoading(false);
  }

  // Poll trạng thái thanh toán khi đang mở QR
  useEffect(() => {
    if (!topupInfo) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/status/${topupInfo.reference}`);
        const d = await r.json();
        if (d.status === "completed") {
          clearInterval(iv);
          setTopupOpen(false); setTopupInfo(null);
          loadBalance();
          setToast(`Đã nạp ${topupInfo.credits} credit!`);
          setTimeout(() => setToast(null), 3000);
        } else if (d.status === "expired") {
          clearInterval(iv);
          setTopupInfo(null);
        }
      } catch { /* noop */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [topupInfo, loadBalance]);

  async function sendInterest() {
    if (!interestModal) return;
    setSending(true);
    try {
      const r = await fetch("/api/recruitment/talent/interest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: interestModal.id, jobId: view === "suggest" ? selJob || null : null, message: interestMsg || null }),
      });
      const d = await r.json();
      if (r.status === 402) { setInterestModal(null); setToast("Không đủ credit — hãy nạp thêm."); setTopupOpen(true); setSending(false); setTimeout(() => setToast(null), 2500); return; }
      if (d.ok) {
        setToast(d.duplicate ? "Bạn đã quan tâm hồ sơ này rồi." : "Đã gửi quan tâm! Ứng viên sẽ nhận thông báo và phản hồi.");
        if (typeof d.balanceLeft === "number") setBalance(d.balanceLeft);
        setInterestModal(null); setInterestMsg("");
        loadInterests();
        setTimeout(() => setToast(null), 2500);
      } else alert(d.error || "Không gửi được");
    } catch { alert("Lỗi kết nối"); }
    setSending(false);
  }

  if (locked) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <ShieldCheck size={32} className="text-purple-400 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-gray-600 font-medium">Tìm ứng viên trong cộng đồng chỉ có ở gói Business</p>
        <p className="text-sm text-gray-400 mt-1">Nâng cấp để tiếp cận ứng viên xác thực bằng dữ liệu chấm công.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && <div className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-2.5">{toast}</div>}

      {/* Thanh trên: view toggle + credit */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setView("browse")} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${view === "browse" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Kho ứng viên</button>
          <button onClick={() => { setView("suggest"); if (!selJob && jobs[0]) { setSelJob(jobs[0].id); runSuggest(jobs[0].id); } }} className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${view === "suggest" ? "bg-white text-purple-700 shadow-sm" : "text-gray-500"}`}><Sparkles size={14} /> Gợi ý AI</button>
          <button onClick={() => { setView("mine"); loadInterests(); }} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${view === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Đã quan tâm ({interests.length})</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 font-medium"><Coins size={15} /> {balance} credit</span>
          {role === "owner" && <button onClick={() => setTopupOpen(true)} className="text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">Nạp</button>}
        </div>
      </div>

      {view === "browse" && (
        <>
          {/* Bộ lọc */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={viTri} onChange={(e) => setViTri(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadBrowse()} placeholder="Vị trí / kỹ năng..." className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
            <input value={khuVuc} onChange={(e) => setKhuVuc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadBrowse()} placeholder="Khu vực" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:ring-2 focus:ring-blue-400 outline-none" />
            <select value={diemMin} onChange={(e) => setDiemMin(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">Điểm bất kỳ</option>
              <option value="70">≥ 70 điểm</option>
              <option value="85">≥ 85 điểm</option>
            </select>
            <button onClick={loadBrowse} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700">Lọc</button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : cands.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Search size={30} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm">Chưa có ứng viên phù hợp trong cộng đồng.</p>
              <p className="text-xs text-gray-400 mt-1">Kho sẽ lớn dần khi các công ty mời cựu nhân viên tham gia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cands.map((c) => <CandCard key={c.id} c={c} onInterest={(x) => { setInterestModal(x); setInterestMsg(""); }} />)}
            </div>
          )}
        </>
      )}

      {view === "suggest" && (
        <>
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-purple-800 flex items-center gap-1.5 font-medium mb-2"><Sparkles size={15} /> AI gợi ý cựu nhân viên phù hợp nhất với tin tuyển dụng của bạn</p>
            <div className="flex gap-2 flex-wrap">
              <select value={selJob} onChange={(e) => { setSelJob(e.target.value); runSuggest(e.target.value); }} className="flex-1 min-w-[200px] border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-400 outline-none">
                <option value="">— Chọn tin tuyển dụng —</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              {selJob && <button onClick={() => runSuggest(selJob)} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-purple-700">Làm mới</button>}
            </div>
            {!aiOn && <p className="text-[11px] text-purple-500 mt-2">Đang xếp hạng theo từ khóa (AI chưa bật). Bật ANTHROPIC_API_KEY để có gợi ý thông minh hơn.</p>}
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm">Chưa có tin tuyển dụng đang mở. Hãy đăng tin trước.</div>
          ) : suggestLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> AI đang phân tích...</div>
          ) : !selJob ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm">Chọn một tin tuyển dụng để xem gợi ý.</div>
          ) : suggested.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm">Chưa tìm được ứng viên phù hợp cho vị trí này.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggested.map((c) => <CandCard key={c.id} c={c} onInterest={(x) => { setInterestModal(x); setInterestMsg(""); }} />)}
            </div>
          )}
        </>
      )}

      {view === "mine" && (
        interests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500 text-sm">Bạn chưa quan tâm ứng viên nào.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
            {interests.map((i) => (
              <div key={i.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 text-sm">{i.maskedName}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${i.status === "accepted" ? "bg-green-100 text-green-700" : i.status === "declined" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {i.status === "accepted" ? "Đã đồng ý" : i.status === "declined" ? "Đã từ chối (hoàn credit)" : "Chờ phản hồi"}
                  </span>
                </div>
                {i.status === "accepted" && i.contact && (
                  <div className="mt-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm">
                    <p className="font-semibold text-gray-800 flex items-center gap-1.5"><CheckCircle2 size={14} className="text-green-600" /> {i.contact.name}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      {i.contact.phone && <a href={`tel:${i.contact.phone}`} className="flex items-center gap-1 text-blue-600"><Phone size={12} /> {i.contact.phone}</a>}
                      {i.contact.email && <span className="flex items-center gap-1"><Mail size={12} /> {i.contact.email}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal gửi quan tâm */}
      {interestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setInterestModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Quan tâm {interestModal.maskedName}</h3>
            <p className="text-xs text-gray-500 mb-3">Trừ <b>1 credit</b>. Ứng viên nhận thông báo (ẩn danh) và tự quyết định. Nếu họ <b>từ chối</b>, credit được <b>hoàn lại</b>.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn cho ứng viên (tùy chọn)</label>
            <textarea rows={3} value={interestMsg} onChange={(e) => setInterestMsg(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="VD: Bên em đang tuyển vị trí phù hợp với bạn, mong được kết nối..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setInterestModal(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={sendInterest} disabled={sending} className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Đang gửi...</> : <><Heart size={15} /> Gửi quan tâm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nạp credit (Sepay chuyển khoản) */}
      {topupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setTopupOpen(false); setTopupInfo(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800">Nạp credit tìm ứng viên</h3>
              <button onClick={() => { setTopupOpen(false); setTopupInfo(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {!topupInfo ? (
              <>
                <p className="text-xs text-gray-500 mb-3">Mỗi credit = 1 lượt mở khóa liên hệ ứng viên. Gói lớn giá tốt hơn.</p>
                <div className="grid grid-cols-2 gap-2">
                  {CREDIT_PACKS.map((p) => (
                    <button key={p.id} onClick={() => startTopup(p.id)} disabled={topupLoading} className="border border-gray-200 rounded-xl p-3 text-left hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 transition">
                      <p className="font-bold text-gray-800">{p.label}</p>
                      <p className="text-sm text-blue-700 font-semibold">{vnd(p.price)}đ</p>
                      <p className="text-[11px] text-gray-400">{vnd(Math.round(p.price / p.credits))}đ/lượt</p>
                    </button>
                  ))}
                </div>
                {topupLoading && <p className="text-center text-sm text-gray-400 mt-3 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Đang tạo đơn...</p>}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-2">Quét mã hoặc chuyển khoản <b>{vnd(topupInfo.amount)}đ</b> để nhận <b>{topupInfo.credits} credit</b>:</p>
                <div className="flex justify-center mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={topupInfo.qrUrl} alt="QR chuyển khoản" className="w-56 h-56 rounded-xl border border-gray-200" />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Ngân hàng</span><span className="font-medium">{topupInfo.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số TK</span><span className="font-medium">{topupInfo.accountNumber}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Chủ TK</span><span className="font-medium">{topupInfo.accountName}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500">Nội dung</span><span className="font-mono font-bold text-blue-700">{topupInfo.transferNote}</span></div>
                </div>
                <p className="text-xs text-amber-600 mt-2">⚠️ Giữ nguyên nội dung chuyển khoản để hệ thống tự cộng credit.</p>
                <p className="text-center text-sm text-gray-500 mt-3 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Đang chờ thanh toán... (tự cập nhật)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
