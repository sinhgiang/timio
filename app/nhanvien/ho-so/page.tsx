"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle,
  Facebook, ArrowLeft, Palette, Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2,
} from "lucide-react";

type Profile = {
  name: string; avatarUrl: string | null; role: string; department: string | null;
  companyName: string | null; location: string; tags: string[];
  socials: { phone: string | null; email: string | null; zalo: string | null; facebook: string | null };
  verified: { experienceMonths: number; totalDaysWorked: number; punctualityRate: number | null; companiesCount: number };
  experiences: { companyName: string; position: string; department: string | null; branchName: string | null; joinDate: string | null; active: boolean; monthsHere: number | null }[];
};

// ── Bảng màu mềm (như mẫu) ──
const THEMES: Record<string, { label: string; swatch: string; page: string; accent: string; softBg: string; ring: string; underline: string; chipBg: string }> = {
  blue:    { label: "Xanh dương", swatch: "bg-sky-300",     page: "bg-gradient-to-b from-sky-50 to-white",       accent: "text-sky-600",     softBg: "bg-sky-50",     ring: "ring-sky-200",     underline: "bg-sky-300",     chipBg: "bg-sky-50 text-sky-700 border-sky-100" },
  rose:    { label: "Hồng",       swatch: "bg-rose-300",    page: "bg-gradient-to-b from-rose-50 to-white",      accent: "text-rose-500",    softBg: "bg-rose-50",    ring: "ring-rose-200",    underline: "bg-rose-300",    chipBg: "bg-rose-50 text-rose-600 border-rose-100" },
  beige:   { label: "Be",         swatch: "bg-amber-200",   page: "bg-gradient-to-b from-amber-50 to-white",     accent: "text-amber-700",   softBg: "bg-amber-50",   ring: "ring-amber-200",   underline: "bg-amber-300",   chipBg: "bg-amber-50 text-amber-700 border-amber-100" },
  green:   { label: "Xanh lá",    swatch: "bg-emerald-300", page: "bg-gradient-to-b from-emerald-50 to-white",   accent: "text-emerald-600", softBg: "bg-emerald-50", ring: "ring-emerald-200", underline: "bg-emerald-300", chipBg: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  violet:  { label: "Tím",        swatch: "bg-violet-300",  page: "bg-gradient-to-b from-violet-50 to-white",    accent: "text-violet-600",  softBg: "bg-violet-50",  ring: "ring-violet-200",  underline: "bg-violet-300",  chipBg: "bg-violet-50 text-violet-700 border-violet-100" },
  slate:   { label: "Xám",        swatch: "bg-slate-300",   page: "bg-gradient-to-b from-slate-100 to-white",    accent: "text-slate-600",   softBg: "bg-slate-50",   ring: "ring-slate-300",   underline: "bg-slate-300",   chipBg: "bg-slate-100 text-slate-600 border-slate-200" },
};

function expLabel(months: number): string {
  if (months <= 0) return "Mới bắt đầu";
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} tháng`;
  if (m === 0) return `${y} năm`;
  return `${y} năm ${m} tháng`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeKey, setThemeKey] = useState<string>("blue");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { try { const t = localStorage.getItem("timio_profile_theme"); if (t && THEMES[t]) setThemeKey(t); } catch { /* */ } }, []);
  const pickTheme = (k: string) => { setThemeKey(k); try { localStorage.setItem("timio_profile_theme", k); } catch { /* */ } };

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/worker/profile");
      if (r.status === 401) { router.push("/nhanvien"); return; }
      if (r.ok) setData(await r.json());
    } catch { /* */ }
    setLoading(false);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const t = THEMES[themeKey];

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;
  if (!data) return null;

  const firstName = data.name.trim().split(/\s+/).pop() || data.name;
  const v = data.verified;

  const share = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen ${t.page} pb-12`}>
      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-4 pt-4 flex items-center justify-between">
        <button onClick={() => router.push("/nhanvien")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Trang chủ
        </button>
        <div className="relative">
          <button onClick={() => setPickerOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 bg-white/70 backdrop-blur border border-gray-200 rounded-full px-3 py-1.5 transition-colors">
            <Palette size={15} /> Đổi màu
          </button>
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-20 w-44">
              <p className="text-[11px] text-gray-400 mb-2 px-1">Màu hồ sơ</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(THEMES).map(([k, th]) => (
                  <button key={k} onClick={() => { pickTheme(k); }} className={`flex flex-col items-center gap-1 rounded-xl py-2 hover:bg-gray-50 ${themeKey === k ? "ring-2 ring-offset-1 ring-gray-300" : ""}`}>
                    <span className={`w-6 h-6 rounded-full ${th.swatch} flex items-center justify-center`}>{themeKey === k && <CheckCircle2 size={13} className="text-white" />}</span>
                    <span className="text-[10px] text-gray-500">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thẻ hồ sơ chính */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 p-6 sm:p-9">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
            {/* Avatar */}
            <div className="shrink-0 mx-auto sm:mx-0">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.name} className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ${t.ring} ring-offset-2`} />
              ) : (
                <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full ${t.softBg} ${t.accent} flex items-center justify-center text-4xl font-serif ring-4 ${t.ring} ring-offset-2`}>{firstName[0]}</div>
              )}
            </div>

            {/* Thông tin */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight relative inline-block">
                  {data.name}
                  <span className={`absolute left-0 -bottom-1 h-[3px] w-full ${t.underline} rounded-full opacity-70`} />
                </h1>
                <BadgeCheck size={22} className={t.accent} />
              </div>
              <p className="text-gray-500 mt-2 text-sm">{data.role}{data.companyName ? <> · {data.companyName}</> : null}</p>

              {/* Social */}
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                {data.socials.phone && <a href={`tel:${data.socials.phone}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500" title={data.socials.phone}><Phone size={14} /></a>}
                {data.socials.email && <a href={`mailto:${data.socials.email}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500" title={data.socials.email}><Mail size={14} /></a>}
                {data.socials.zalo && <a href={data.socials.zalo.startsWith("http") ? data.socials.zalo : `https://zalo.me/${data.socials.zalo.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500" title="Zalo"><MessageCircle size={14} /></a>}
                {data.socials.facebook && <a href={data.socials.facebook.startsWith("http") ? data.socials.facebook : `https://facebook.com/${data.socials.facebook}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500" title="Facebook"><Facebook size={14} /></a>}
                <button onClick={share} className="ml-1 flex items-center gap-1.5 text-xs bg-gray-900 text-white rounded-full px-3 py-1.5 hover:bg-gray-700 transition-colors">
                  <Share2 size={13} /> {copied ? "Đã chép" : "Chia sẻ"}
                </button>
              </div>
            </div>
          </div>

          {/* Thẻ chuyên môn */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 justify-center sm:justify-start">
              {data.tags.map((tag, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${t.chipBg}`}>
                  <Star size={11} className="fill-current opacity-60" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta: Vai trò · Địa điểm · Kinh nghiệm */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-7 pt-6 border-t border-gray-100">
            <Meta icon={<Briefcase size={14} />} label="Vai trò" value={data.role} />
            <Meta icon={<MapPin size={14} />} label="Địa điểm" value={data.location} />
            <Meta icon={<CalendarClock size={14} />} label="Kinh nghiệm" value={expLabel(v.experienceMonths)} />
          </div>
        </div>

        {/* Được Timio xác thực */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className={t.accent} />
            <p className="text-sm font-semibold text-gray-800">Được Timio xác thực</p>
            <span className="text-[11px] text-gray-400">· từ dữ liệu chấm công thật</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat theme={t} icon={<CalendarClock size={16} />} value={expLabel(v.experienceMonths)} label="Kinh nghiệm" />
            <Stat theme={t} icon={<Clock size={16} />} value={`${v.totalDaysWorked}`} label="Ngày công" />
            <Stat theme={t} icon={<CheckCircle2 size={16} />} value={v.punctualityRate != null ? `${v.punctualityRate}%` : "—"} label="Đúng giờ" />
            <Stat theme={t} icon={<Building2 size={16} />} value={`${v.companiesCount}`} label="Nơi đã làm" />
          </div>
        </div>

        {/* Kinh nghiệm làm việc */}
        {data.experiences.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Briefcase size={15} /> Kinh nghiệm làm việc</p>
            <div className="space-y-3">
              {data.experiences.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-9 h-9 rounded-xl ${t.softBg} flex items-center justify-center shrink-0`}><Building2 size={17} className={t.accent} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800 text-sm">{e.position}</p>
                      {e.active ? <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Đang làm</span>
                                : <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Đã nghỉ</span>}
                    </div>
                    <p className="text-xs text-gray-500">{e.companyName}{e.branchName ? ` · ${e.branchName}` : ""}{e.department ? ` · ${e.department}` : ""}</p>
                    {e.monthsHere != null && <p className="text-[11px] text-gray-400 mt-0.5">{expLabel(e.monthsHere)}{e.joinDate ? ` · từ ${new Date(e.joinDate).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}` : ""}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-5 flex items-center justify-center gap-1">
          <ShieldCheck size={12} /> Hồ sơ được xác thực bằng dữ liệu chấm công Timio — số liệu là thật, không tự khai.
        </p>
      </div>
    </div>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-1 justify-center sm:justify-start">{icon} {label}</p>
      <p className="text-sm font-medium text-gray-800 mt-1 truncate">{value}</p>
    </div>
  );
}

function Stat({ theme, icon, value, label }: { theme: typeof THEMES[string]; icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className={`rounded-xl ${theme.softBg} p-3 text-center`}>
      <div className={`w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center mx-auto mb-1.5 ${theme.accent}`}>{icon}</div>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
