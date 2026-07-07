"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, TrendingUp, Search, Loader2, Coins, Heart, CheckCircle2, Phone, Mail } from "lucide-react";

type Cand = {
  id: string; maskedName: string; desiredTitle: string | null; desiredArea: string | null;
  desiredSalaryMin: number | null; desiredSalaryMax: number | null; skills: string | null; bio: string | null;
  vScore: number | null; vAttendance: number | null; vPunctuality: number | null; vTenureMonths: number | null;
  vDevScore: number | null; vDevTrend: string | null; vPromotions: number | null; vReviewCount: number | null;
};
type Interest = { id: string; profileId: string; maskedName: string; status: string; message: string | null; createdAt: string; contact: { name: string; phone: string | null; email: string | null } | null };

function scoreCls(s: number | null) {
  if (s == null) return "bg-gray-100 text-gray-500";
  if (s >= 70) return "bg-green-100 text-green-700";
  if (s >= 40) return "bg-amber-100 text-amber-700";
  return "bg-gray-200 text-gray-600";
}

export default function TalentBrowse({ role }: { role: string }) {
  const [view, setView] = useState<"browse" | "mine">("browse");
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

  useEffect(() => { loadBalance(); loadBrowse(); loadInterests(); }, [loadBalance, loadBrowse, loadInterests]);

  async function topUp() {
    const n = prompt("Nạp bao nhiêu credit? (1 credit = 1 lượt mở khóa liên hệ)", "10");
    if (!n) return;
    const r = await fetch("/api/recruitment/talent/credit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credits: Number(n) }) });
    const d = await r.json();
    if (d.ok) { setBalance(d.balance); setToast("Đã nạp credit."); setTimeout(() => setToast(null), 2000); }
    else alert(d.error || "Nạp thất bại");
  }

  async function sendInterest() {
    if (!interestModal) return;
    setSending(true);
    try {
      const r = await fetch("/api/recruitment/talent/interest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: interestModal.id, message: interestMsg || null }),
      });
      const d = await r.json();
      if (r.status === 402) { alert(d.error); setSending(false); return; }
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
          <button onClick={() => setView("browse")} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${view === "browse" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Kho ứng viên xác thực</button>
          <button onClick={() => { setView("mine"); loadInterests(); }} className={`px-3.5 py-2 rounded-lg text-sm font-medium ${view === "mine" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`}>Đã quan tâm ({interests.length})</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 font-medium"><Coins size={15} /> {balance} credit</span>
          {role === "owner" && <button onClick={topUp} className="text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">Nạp</button>}
        </div>
      </div>

      {view === "browse" ? (
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
              {cands.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{c.maskedName}</p>
                      <p className="text-xs text-gray-500">{c.desiredTitle || "—"}{c.desiredArea ? ` · ${c.desiredArea}` : ""}</p>
                    </div>
                    <ShieldCheck size={16} className="text-blue-500 shrink-0" strokeWidth={1.8} />
                  </div>
                  {/* 2 điểm */}
                  <div className="flex gap-2 mb-2">
                    <div className={`flex-1 rounded-lg px-2.5 py-1.5 text-center ${scoreCls(c.vScore)}`}>
                      <p className="text-sm font-bold">{c.vScore ?? "—"}</p><p className="text-[10px]">Chấm công</p>
                    </div>
                    <div className={`flex-1 rounded-lg px-2.5 py-1.5 text-center ${scoreCls(c.vDevScore)}`}>
                      <p className="text-sm font-bold flex items-center justify-center gap-0.5">{c.vDevScore ?? "—"} {c.vDevTrend === "up" && <TrendingUp size={11} />}</p><p className="text-[10px]">Phát triển</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 mb-2">
                    {c.vAttendance != null && <span>Chuyên cần {c.vAttendance}%</span>}
                    {c.vTenureMonths != null && <span>Thâm niên {c.vTenureMonths}th</span>}
                    {(c.vPromotions ?? 0) > 0 && <span className="text-emerald-600">Thăng chức {c.vPromotions}×</span>}
                    {(c.desiredSalaryMin || c.desiredSalaryMax) && <span>Mong muốn {c.desiredSalaryMin ? (c.desiredSalaryMin / 1_000_000) : "?"}–{c.desiredSalaryMax ? (c.desiredSalaryMax / 1_000_000) : "?"}tr</span>}
                  </div>
                  {c.skills && <p className="text-xs text-gray-600 line-clamp-2 mb-2">{c.skills}</p>}
                  <button onClick={() => { setInterestModal(c); setInterestMsg(""); }} className="w-full flex items-center justify-center gap-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-purple-700">
                    <Heart size={14} /> Quan tâm (mở khóa 1 credit)
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // Đã quan tâm
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
    </div>
  );
}
