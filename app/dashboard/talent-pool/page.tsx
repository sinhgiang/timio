"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Award, Loader2, Handshake, Phone, Search, ShieldCheck, Clock, CheckCircle2, Briefcase,
  MessageCircle, ExternalLink, MapPin, Coins, X, Users, UserCheck, Mail, Heart,
} from "lucide-react";
import { VN_REGIONS, AREA_REMOTE, AREA_ANYWHERE } from "@/lib/vnLocations";
import JobPicker from "@/components/JobPicker";

type Cand = {
  source: "worker" | "talent";
  id: string; name: string; avatarUrl: string | null;
  trustScore: number | null; trustLevel: string; trustLabel: string;
  daysWorked: number; experienceMonths: number;
  desiredPosition: string | null; desiredArea: string | null; keywords: string[];
  connectionStatus: string | null;
  phone: string | null; zalo: string | null; handle: string | null; email: string | null;
};

type Pack = { id: string; credits: number; price: number; label: string };
type TopupInfo = { reference: string; amount: number; credits: number; packLabel: string; qrUrl: string; bankName: string; accountNumber: string; accountName: string; transferNote: string };

const CREDIT_PACKS: Pack[] = [
  { id: "c10", credits: 10, price: 200000, label: "10 lượt" },
  { id: "c30", credits: 30, price: 540000, label: "30 lượt" },
  { id: "c50", credits: 50, price: 850000, label: "50 lượt" },
  { id: "c100", credits: 100, price: 1600000, label: "100 lượt" },
];

const LEVEL: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  bronze: "bg-orange-100 text-orange-700 border-orange-200",
  new: "bg-gray-100 text-gray-500 border-gray-200",
};
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
const expLabel = (m: number) => m <= 0 ? "Mới" : m < 12 ? `${m} tháng` : `${Math.floor(m / 12)} năm${m % 12 ? ` ${m % 12} th` : ""}`;

const SOURCES: { k: string; label: string }[] = [
  { k: "", label: "Tất cả" },
  { k: "worker", label: "NLĐ tự đăng ký" },
  { k: "talent", label: "Cựu nhân viên (cộng đồng)" },
];

export default function TalentPoolPage() {
  const [list, setList] = useState<Cand[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [canTopup, setCanTopup] = useState(false);
  const [minTrust, setMinTrust] = useState(0);
  const [q, setQ] = useState("");
  const [occupation, setOccupation] = useState("");
  const [area, setArea] = useState("");
  const [source, setSource] = useState("");
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Modal quan tâm
  const [connectCand, setConnectCand] = useState<Cand | null>(null);
  const [connectNote, setConnectNote] = useState("");
  const [sending, setSending] = useState(false);

  // Modal nạp credit
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupInfo, setTopupInfo] = useState<TopupInfo | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/talent-pool?minTrust=${minTrust}&q=${encodeURIComponent(q)}&occupation=${encodeURIComponent(occupation)}&area=${encodeURIComponent(area)}&source=${source}`);
      if (r.ok) { const d = await r.json(); setList(d.candidates || []); setBalance(d.balance ?? 0); setCanTopup(!!d.canTopup); }
    } catch { /* */ }
    setLoading(false);
  }, [minTrust, q, occupation, area, source]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function sendConnect() {
    if (!connectCand) return;
    setSending(true);
    const key = `${connectCand.source}:${connectCand.id}`;
    setActing((p) => ({ ...p, [key]: true }));
    try {
      const r = await fetch("/api/talent-pool", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: connectCand.source, id: connectCand.id, note: connectNote || null }),
      });
      const d = await r.json();
      if (r.status === 402) { setConnectCand(null); flash("Không đủ credit — hãy nạp thêm."); setTopupOpen(true); }
      else if (d.ok) {
        setConnectCand(null); setConnectNote("");
        if (typeof d.balanceLeft === "number") setBalance(d.balanceLeft);
        flash(d.already ? "Bạn đã quan tâm ứng viên này rồi." : d.status === "accepted" ? "Đã kết nối! Ứng viên cho phép liên hệ ngay." : "Đã gửi quan tâm — chờ ứng viên đồng ý.");
        load();
      } else flash(d.error || "Không gửi được.");
    } catch { flash("Lỗi kết nối."); }
    setActing((p) => ({ ...p, [key]: false }));
    setSending(false);
  }

  async function startTopup(packId: string) {
    setTopupLoading(true);
    try {
      const r = await fetch("/api/recruitment/talent/credit/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) });
      const d = await r.json();
      if (!r.ok) { flash(d.error || "Không tạo được đơn nạp."); setTopupLoading(false); return; }
      setTopupInfo(d);
    } catch { flash("Lỗi kết nối."); }
    setTopupLoading(false);
  }
  useEffect(() => {
    if (!topupInfo) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/payment/status/${topupInfo.reference}`);
        const d = await r.json();
        if (d.status === "completed") { clearInterval(iv); setTopupOpen(false); setTopupInfo(null); flash(`Đã nạp ${topupInfo.credits} credit!`); load(); }
        else if (d.status === "expired") { clearInterval(iv); setTopupInfo(null); }
      } catch { /* */ }
    }, 4000);
    return () => clearInterval(iv);
  }, [topupInfo, load]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white text-sm rounded-xl px-4 py-2.5 shadow-lg">{toast}</div>}

      {/* Tiêu đề + số dư credit */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={22} className="text-blue-600" /> Kho ứng viên xác thực</h1>
          <p className="text-gray-500 text-sm mt-0.5 max-w-2xl">Người lao động có <b>điểm tin cậy từ chấm công thật</b> — không phải CV tự khai. Mỗi lượt “Quan tâm” trừ <b>1 credit</b>, <b>hoàn lại</b> nếu ứng viên từ chối. Chỉ khi ứng viên đồng ý, bạn mới thấy liên hệ.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-xl px-3 py-2 font-semibold"><Coins size={16} /> {balance} credit</span>
          {canTopup && <button onClick={() => setTopupOpen(true)} className="text-sm bg-blue-600 text-white rounded-xl px-3.5 py-2 font-medium hover:bg-blue-700">Nạp credit</button>}
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <JobPicker value={occupation} onChange={setOccupation} allLabel="Tất cả ngành nghề" />
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full appearance-none border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
              <option value="">Toàn quốc</option>
              <option value={AREA_ANYWHERE}>{AREA_ANYWHERE}</option>
              <option value={AREA_REMOTE}>{AREA_REMOTE}</option>
              {VN_REGIONS.map((r) => (
                <optgroup key={r.label} label={r.label}>
                  {r.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2.5 mt-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo từ khóa (kỹ năng, mong muốn...)" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>
          <select value={minTrust} onChange={(e) => setMinTrust(Number(e.target.value))} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
            <option value={0}>Mọi điểm tin cậy</option>
            <option value={70}>Từ 70 điểm (Bạc↑)</option>
            <option value={85}>Từ 85 điểm (Vàng)</option>
          </select>
        </div>
        {/* Lọc theo nguồn */}
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {SOURCES.map((s) => (
            <button key={s.k} onClick={() => setSource(s.k)} className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${source === s.k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin inline" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Handshake size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.3} />
          <p className="text-gray-500 text-sm">Chưa có ứng viên nào khớp bộ lọc.</p>
          <p className="text-gray-400 text-xs mt-1">Kho lớn dần khi NLĐ bật &quot;Đang tìm việc&quot; và khi bạn mời cựu nhân viên vào cộng đồng.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((c) => {
            const key = `${c.source}:${c.id}`;
            const isTalent = c.source === "talent";
            return (
              <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold shrink-0 ${isTalent ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-700"}`}>
                    {isTalent ? <ShieldCheck size={20} strokeWidth={1.8} /> : c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                      {c.trustScore != null && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL[c.trustLevel] ?? LEVEL.new}`}>{c.trustScore}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.desiredPosition || "Chưa ghi vị trí"}{c.desiredArea ? ` · ${c.desiredArea}` : ""}</p>
                  </div>
                </div>

                {/* Nhãn nguồn */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isTalent ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                    {isTalent ? <><Users size={11} /> Cựu NV · cộng đồng</> : <><UserCheck size={11} /> NLĐ tự đăng ký</>}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 flex-wrap">
                  {c.trustScore != null && <span className="inline-flex items-center gap-1"><Award size={12} className="text-amber-500" /> {c.trustLabel}</span>}
                  {!isTalent && <span className="inline-flex items-center gap-1"><Clock size={12} /> {c.daysWorked} ngày công</span>}
                  <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {expLabel(c.experienceMonths)}</span>
                </div>

                {c.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {c.keywords.slice(0, 6).map((k, i) => <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{k}</span>)}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-50 mt-auto">
                  {c.connectionStatus === "accepted" ? (
                    <div>
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1 mb-2"><CheckCircle2 size={13} /> Đã kết nối — ứng viên cho phép liên hệ</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {c.phone && <a href={`tel:${c.phone}`} className="flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-blue-700"><Phone size={13} /> Gọi</a>}
                        {c.zalo && <a href={c.zalo.startsWith("http") ? c.zalo : `https://zalo.me/${c.zalo.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-sky-500 text-white rounded-lg py-2 text-xs font-medium hover:bg-sky-600"><MessageCircle size={13} /> Nhắn Zalo</a>}
                        {c.email && <a href={`mailto:${c.email}`} className={`flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 ${c.phone ? "" : "col-span-2"}`}><Mail size={13} /> Email</a>}
                        {c.handle && <a href={`/ho-so/${c.handle}`} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 ${c.phone && c.zalo ? "col-span-2" : ""}`}><ExternalLink size={13} /> Xem hồ sơ đầy đủ</a>}
                      </div>
                      {c.phone && <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1"><Phone size={11} /> {c.phone}</p>}
                    </div>
                  ) : c.connectionStatus === "pending" ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5"><Clock size={13} /> Đã gửi quan tâm — chờ ứng viên đồng ý</p>
                  ) : c.connectionStatus === "declined" ? (
                    <p className="text-xs text-gray-400">Ứng viên đã bỏ qua (credit đã hoàn)</p>
                  ) : (
                    <button onClick={() => { setConnectCand(c); setConnectNote(""); }} disabled={acting[key]} className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {acting[key] ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />} Quan tâm
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-5 flex items-center gap-1.5"><ShieldCheck size={12} /> Hồ sơ do người lao động sở hữu và tự nguyện chia sẻ (opt-in) — đúng Luật Bảo vệ Dữ liệu Cá nhân. Trả credit chỉ để gửi lời quan tâm; thông tin ẩn cho đến khi ứng viên đồng ý.</p>

      {/* Modal Quan tâm */}
      {connectCand && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConnectCand(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2"><Heart size={18} className="text-blue-600" /> Quan tâm {connectCand.name}</h3>
            <p className="text-xs text-gray-500 mb-3">Trừ <b>1 credit</b> (số dư: {balance}). Ứng viên nhận thông báo và tự quyết định. Nếu họ <b>từ chối</b>, credit được <b>hoàn lại</b>.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn cho ứng viên (tùy chọn)</label>
            <textarea rows={3} value={connectNote} onChange={(e) => setConnectNote(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="VD: Bên em đang tuyển vị trí phù hợp với bạn, mong được kết nối..." />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConnectCand(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={sendConnect} disabled={sending} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                {sending ? <><Loader2 size={15} className="animate-spin" /> Đang gửi...</> : <><Handshake size={15} /> Gửi quan tâm</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nạp credit */}
      {topupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setTopupOpen(false); setTopupInfo(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Coins size={18} className="text-amber-500" /> Nạp credit tìm ứng viên</h3>
              <button onClick={() => { setTopupOpen(false); setTopupInfo(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {!topupInfo ? (
              <>
                <p className="text-xs text-gray-500 mb-3">Mỗi credit = 1 lượt “Quan tâm” (hoàn nếu ứng viên từ chối). Gói lớn giá tốt hơn.</p>
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
                <p className="text-xs text-amber-600 mt-2">Giữ nguyên nội dung chuyển khoản để hệ thống tự cộng credit.</p>
                <p className="text-center text-sm text-gray-500 mt-3 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Đang chờ thanh toán... (tự cập nhật)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
