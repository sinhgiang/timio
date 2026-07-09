"use client";
import { useState, useEffect, useCallback } from "react";
import { Award, Loader2, Handshake, Phone, Search, ShieldCheck, Clock, CheckCircle2, Briefcase } from "lucide-react";
import { JOB_CATEGORIES } from "@/lib/jobTaxonomy";
import { VN_REGIONS, AREA_REMOTE, AREA_ANYWHERE } from "@/lib/vnLocations";

type Candidate = {
  workerAccountId: string; name: string; avatarUrl: string | null;
  trustScore: number | null; trustLevel: string; trustLabel: string;
  daysWorked: number; experienceMonths: number;
  desiredPosition: string | null; desiredArea: string | null; keywords: string[];
  connectionStatus: string | null; phone: string | null;
};

const LEVEL: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  bronze: "bg-orange-100 text-orange-700 border-orange-200",
  new: "bg-gray-100 text-gray-500 border-gray-200",
};
const expLabel = (m: number) => m <= 0 ? "Mới" : m < 12 ? `${m} tháng` : `${Math.floor(m / 12)} năm${m % 12 ? ` ${m % 12} th` : ""}`;

export default function TalentPoolPage() {
  const [list, setList] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [minTrust, setMinTrust] = useState(0);
  const [q, setQ] = useState("");
  const [occupation, setOccupation] = useState("");
  const [area, setArea] = useState("");
  const [acting, setActing] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/talent-pool?minTrust=${minTrust}&q=${encodeURIComponent(q)}&occupation=${encodeURIComponent(occupation)}&area=${encodeURIComponent(area)}`);
      if (r.ok) setList((await r.json()).candidates || []);
    } catch { /* */ }
    setLoading(false);
  }, [minTrust, q, occupation, area]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const connect = async (id: string) => {
    setActing((p) => ({ ...p, [id]: true }));
    await fetch("/api/talent-pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workerAccountId: id }) }).catch(() => {});
    await load();
    setActing((p) => ({ ...p, [id]: false }));
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={22} className="text-blue-600" /> Kho ứng viên xác thực</h1>
        <p className="text-gray-500 text-sm mt-0.5">Người lao động đang tìm việc, có <b>điểm tin cậy từ chấm công thật</b> — không phải CV tự khai. Bấm "Quan tâm", ứng viên đồng ý thì bạn thấy số điện thoại.</p>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
            <option value="">🔎 Tất cả ngành nghề</option>
            {JOB_CATEGORIES.map((cat) => (
              <optgroup key={cat.label} label={cat.label}>
                {cat.jobs.map((j) => <option key={j} value={j}>{j}</option>)}
              </optgroup>
            ))}
          </select>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
            <option value="">📍 Toàn quốc</option>
            <option value={AREA_ANYWHERE}>{AREA_ANYWHERE}</option>
            <option value={AREA_REMOTE}>{AREA_REMOTE}</option>
            {VN_REGIONS.map((r) => (
              <optgroup key={r.label} label={r.label}>
                {r.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>
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
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><Loader2 size={22} className="animate-spin inline" /></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Handshake size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.3} />
          <p className="text-gray-500 text-sm">Chưa có ứng viên nào đang tìm việc khớp bộ lọc.</p>
          <p className="text-gray-400 text-xs mt-1">Ứng viên xuất hiện ở đây khi họ bật &quot;Đang tìm việc&quot; trong app nhân viên.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {list.map((c) => (
            <div key={c.workerAccountId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">{c.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    {c.trustScore != null && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL[c.trustLevel] ?? LEVEL.new}`}>{c.trustScore}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{c.desiredPosition || "Chưa ghi vị trí"}{c.desiredArea ? ` · ${c.desiredArea}` : ""}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500">
                {c.trustScore != null && <span className="inline-flex items-center gap-1"><Award size={12} className="text-amber-500" /> {c.trustLabel}</span>}
                <span className="inline-flex items-center gap-1"><Clock size={12} /> {c.daysWorked} ngày công</span>
                <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {expLabel(c.experienceMonths)}</span>
              </div>

              {c.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.keywords.slice(0, 6).map((k, i) => <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{k}</span>)}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-50">
                {c.connectionStatus === "accepted" ? (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-green-600" />
                    {c.phone ? <a href={`tel:${c.phone}`} className="text-blue-600 font-medium flex items-center gap-1"><Phone size={13} /> {c.phone}</a> : <span className="text-green-600">Đã kết nối</span>}
                  </div>
                ) : c.connectionStatus === "pending" ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1.5"><Clock size={13} /> Đã gửi quan tâm — chờ ứng viên đồng ý</p>
                ) : c.connectionStatus === "declined" ? (
                  <p className="text-xs text-gray-400">Ứng viên đã bỏ qua</p>
                ) : (
                  <button onClick={() => connect(c.workerAccountId)} disabled={acting[c.workerAccountId]} className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {acting[c.workerAccountId] ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />} Quan tâm
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-5 flex items-center gap-1.5"><ShieldCheck size={12} /> Hồ sơ do người lao động sở hữu và tự nguyện chia sẻ (opt-in) — đúng Luật Bảo vệ Dữ liệu Cá nhân.</p>
    </div>
  );
}
