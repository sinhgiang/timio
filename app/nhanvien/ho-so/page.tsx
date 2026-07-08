"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle,
  Facebook, ArrowLeft, Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2,
} from "lucide-react";
import WorkerNav from "@/components/worker/WorkerNav";

type Profile = {
  name: string; avatarUrl: string | null; role: string; department: string | null;
  companyName: string | null; location: string; tags: string[];
  socials: { phone: string | null; email: string | null; zalo: string | null; facebook: string | null };
  verified: { experienceMonths: number; totalDaysWorked: number; punctualityRate: number | null; companiesCount: number };
  experiences: { companyName: string; position: string; department: string | null; branchName: string | null; joinDate: string | null; active: boolean; monthsHere: number | null }[];
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
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/worker/profile");
      if (r.status === 401) { router.push("/nhanvien"); return; }
      if (r.ok) setData(await r.json());
    } catch { /* */ }
    setLoading(false);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;
  if (!data) return null;

  const firstName = data.name.trim().split(/\s+/).pop() || data.name;
  const v = data.verified;

  const share = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 pb-24">
      {/* Top bar */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <button onClick={() => router.push("/nhanvien")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} /> Trang chủ
        </button>
      </div>

      {/* Thẻ hồ sơ chính */}
      <div className="max-w-3xl mx-auto px-4 mt-3">
        <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 overflow-hidden">
          {/* Dải brand mỏng phía trên */}
          <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="p-6 sm:p-9">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
              {/* Avatar */}
              <div className="shrink-0 mx-auto sm:mx-0">
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatarUrl} alt={data.name} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-blue-100 ring-offset-2" />
                ) : (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-serif ring-4 ring-blue-100 ring-offset-2">{firstName[0]}</div>
                )}
              </div>

              {/* Thông tin */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight relative inline-block">
                    {data.name}
                    <span className="absolute left-0 -bottom-1 h-[3px] w-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-80" />
                  </h1>
                  <BadgeCheck size={22} className="text-blue-600" />
                </div>
                <p className="text-gray-500 mt-2 text-sm">{data.role}{data.companyName ? <> · {data.companyName}</> : null}</p>

                {/* Social */}
                <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                  {data.socials.phone && <a href={`tel:${data.socials.phone}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title={data.socials.phone}><Phone size={14} /></a>}
                  {data.socials.email && <a href={`mailto:${data.socials.email}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title={data.socials.email}><Mail size={14} /></a>}
                  {data.socials.zalo && <a href={data.socials.zalo.startsWith("http") ? data.socials.zalo : `https://zalo.me/${data.socials.zalo.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title="Zalo"><MessageCircle size={14} /></a>}
                  {data.socials.facebook && <a href={data.socials.facebook.startsWith("http") ? data.socials.facebook : `https://facebook.com/${data.socials.facebook}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title="Facebook"><Facebook size={14} /></a>}
                  <button onClick={share} className="ml-1 flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-full px-3 py-1.5 hover:bg-blue-700 transition-colors">
                    <Share2 size={13} /> {copied ? "Đã chép" : "Chia sẻ"}
                  </button>
                </div>
              </div>
            </div>

            {/* Thẻ chuyên môn */}
            {data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 justify-center sm:justify-start">
                {data.tags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
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
        </div>

        {/* Được Timio xác thực — dải brand */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-5 mt-4 text-white">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} />
            <p className="text-sm font-semibold">Được Timio xác thực</p>
            <span className="text-[11px] text-blue-200">· từ dữ liệu chấm công thật</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={<CalendarClock size={16} />} value={expLabel(v.experienceMonths)} label="Kinh nghiệm" />
            <Stat icon={<Clock size={16} />} value={`${v.totalDaysWorked}`} label="Ngày công" />
            <Stat icon={<CheckCircle2 size={16} />} value={v.punctualityRate != null ? `${v.punctualityRate}%` : "—"} label="Đúng giờ" />
            <Stat icon={<Building2 size={16} />} value={`${v.companiesCount}`} label="Nơi đã làm" />
          </div>
        </div>

        {/* Kinh nghiệm làm việc */}
        {data.experiences.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Briefcase size={15} /> Kinh nghiệm làm việc</p>
            <div className="space-y-3">
              {data.experiences.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Building2 size={17} className="text-blue-600" /></div>
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

      <WorkerNav />
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mx-auto mb-1.5">{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-blue-100 mt-0.5">{label}</p>
    </div>
  );
}
