"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle, Facebook,
  Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2, Wallet, Umbrella, IdCard, LogOut,
  XCircle,
} from "lucide-react";
import AdvanceCard from "@/components/worker/AdvanceCard";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

type Profile = {
  handle: string | null; isOwner: boolean;
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

export default function HoSoPage({ params }: { params: { handle: string } }) {
  const router = useRouter();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"profile" | "income" | "attendance" | "leave">("profile");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/ho-so/${params.handle}`);
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      if (r.ok) setData(await r.json());
    } catch { /* */ }
    setLoading(false);
  }, [params.handle]);
  useEffect(() => { load(); }, [load]);

  const logout = async () => {
    await fetch("/api/worker/logout", { method: "POST" }).catch(() => {});
    router.push("/nhanvien");
  };
  const share = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;
  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><IdCard size={26} className="text-gray-400" /></div>
      <p className="text-gray-700 font-semibold">Không tìm thấy hồ sơ này</p>
      <p className="text-sm text-gray-400 mt-1">Liên kết có thể sai hoặc đã đổi.</p>
    </div>
  );

  const tabs: { key: typeof tab; label: string; Icon: typeof IdCard }[] = data.isOwner
    ? [
        { key: "profile", label: "Hồ sơ", Icon: IdCard },
        { key: "income", label: "Thu nhập", Icon: Wallet },
        { key: "attendance", label: "Chấm công", Icon: Clock },
        { key: "leave", label: "Nghỉ phép", Icon: Umbrella },
      ]
    : [{ key: "profile", label: "Hồ sơ", Icon: IdCard }];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Top bar */}
      <div className="bg-white/70 backdrop-blur border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{data.name.trim().split(/\s+/).pop()?.[0]}</div>
            <span className="font-semibold text-gray-800 text-sm truncate">{data.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={share} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-full px-3 py-1.5 hover:bg-blue-700 transition-colors">
              <Share2 size={13} /> {copied ? "Đã chép" : "Chia sẻ"}
            </button>
            {data.isOwner && <button onClick={logout} title="Đăng xuất" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><LogOut size={17} /></button>}
          </div>
        </div>
        {/* Tab bar */}
        {tabs.length > 1 && (
          <div className="max-w-3xl mx-auto px-2 flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  <t.Icon size={15} /> {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {tab === "profile" && <ProfileTab data={data} />}
        {tab === "income" && data.isOwner && <IncomeTab />}
        {tab === "attendance" && data.isOwner && <AttendanceTab />}
        {tab === "leave" && data.isOwner && <LeaveTab />}
      </div>
    </div>
  );
}

// ─────────── TAB HỒ SƠ (công khai) ───────────
function ProfileTab({ data }: { data: Profile }) {
  const firstName = data.name.trim().split(/\s+/).pop() || data.name;
  const v = data.verified;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[28px] shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
        <div className="p-6 sm:p-9">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
            <div className="shrink-0 mx-auto sm:mx-0">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.name} className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-blue-100 ring-offset-2" />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-serif ring-4 ring-blue-100 ring-offset-2">{firstName[0]}</div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="font-serif text-3xl sm:text-4xl text-gray-900 leading-tight relative inline-block">
                  {data.name}
                  <span className="absolute left-0 -bottom-1 h-[3px] w-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-80" />
                </h1>
                <BadgeCheck size={22} className="text-blue-600" />
              </div>
              <p className="text-gray-500 mt-2 text-sm">{data.role}{data.companyName ? <> · {data.companyName}</> : null}</p>
              <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                {data.socials.phone && <a href={`tel:${data.socials.phone}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title={data.socials.phone}><Phone size={14} /></a>}
                {data.socials.email && <a href={`mailto:${data.socials.email}`} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title={data.socials.email}><Mail size={14} /></a>}
                {data.socials.zalo && <a href={data.socials.zalo.startsWith("http") ? data.socials.zalo : `https://zalo.me/${data.socials.zalo.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title="Zalo"><MessageCircle size={14} /></a>}
                {data.socials.facebook && <a href={data.socials.facebook.startsWith("http") ? data.socials.facebook : `https://facebook.com/${data.socials.facebook}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-gray-500 transition-colors" title="Facebook"><Facebook size={14} /></a>}
              </div>
            </div>
          </div>

          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 justify-center sm:justify-start">
              {data.tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                  <Star size={11} className="fill-current opacity-60" /> {tag}
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-7 pt-6 border-t border-gray-100">
            <Meta icon={<Briefcase size={14} />} label="Vai trò" value={data.role} />
            <Meta icon={<MapPin size={14} />} label="Địa điểm" value={data.location} />
            <Meta icon={<CalendarClock size={14} />} label="Kinh nghiệm" value={expLabel(v.experienceMonths)} />
          </div>
        </div>
      </div>

      {/* Được Timio xác thực */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} /><p className="text-sm font-semibold">Được Timio xác thực</p>
          <span className="text-[11px] text-blue-200">· từ dữ liệu chấm công thật</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<CalendarClock size={16} />} value={expLabel(v.experienceMonths)} label="Kinh nghiệm" />
          <Stat icon={<Clock size={16} />} value={`${v.totalDaysWorked}`} label="Ngày công" />
          <Stat icon={<CheckCircle2 size={16} />} value={v.punctualityRate != null ? `${v.punctualityRate}%` : "—"} label="Đúng giờ" />
          <Stat icon={<Building2 size={16} />} value={`${v.companiesCount}`} label="Nơi đã làm" />
        </div>
      </div>

      {data.experiences.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
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

      <p className="text-center text-[11px] text-gray-400 flex items-center justify-center gap-1">
        <ShieldCheck size={12} /> Hồ sơ xác thực bằng dữ liệu chấm công Timio — số liệu là thật, không tự khai.
      </p>
    </div>
  );
}

// ─────────── TAB THU NHẬP (riêng tư) ───────────
function IncomeTab() {
  const [earn, setEarn] = useState<{ monthLabel: string; total: number; totalDaysWorked: number; companies: { companyName: string; daysWorked: number; earnedSoFar: number; daysToPayday: number }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/earnings").then((r) => r.ok ? r.json() : null).then(setEarn).catch(() => {}); }, []);
  const minDaysToPay = earn?.companies.length ? Math.min(...earn.companies.map((c) => c.daysToPayday)) : null;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><Wallet size={17} className="text-green-600" /></div>
          <p className="text-sm font-semibold text-gray-700">Thu nhập đã kiếm {earn ? `· ${earn.monthLabel}` : ""}</p>
        </div>
        {earn ? (
          <>
            <p className="text-3xl font-extrabold text-gray-900">~{vnd(earn.total)}<span className="text-base font-semibold text-gray-400"> đ</span></p>
            <p className="text-sm text-gray-500 mt-0.5">Đã đi làm <b className="text-gray-700">{earn.totalDaysWorked} ngày</b>{minDaysToPay != null ? <> · còn <b className="text-gray-700">{minDaysToPay} ngày</b> tới kỳ lương</> : null}</p>
            <p className="text-[11px] text-gray-400 mt-1">Số tạm tính từ ngày công. Số cuối cùng do công ty chốt.</p>
          </>
        ) : <p className="text-sm text-gray-400">Đang tải...</p>}
      </div>
      <AdvanceCard />
    </div>
  );
}

// ─────────── TAB CHẤM CÔNG (riêng tư) ───────────
function AttendanceTab() {
  const [d, setD] = useState<{ summary: { total: number; onTime: number; late: number }; logs: { date: string; checkInAt: string | null; checkOutAt: string | null; minutesLate: number; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/attendance").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>;
  const hhmm = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center"><p className="text-2xl font-bold text-gray-800">{d.summary.total}</p><p className="text-xs text-gray-400">Ngày công</p></div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center"><p className="text-2xl font-bold text-green-700">{d.summary.onTime}</p><p className="text-xs text-green-600">Đúng giờ</p></div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{d.summary.late}</p><p className="text-xs text-amber-600">Đi trễ</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Lịch sử gần đây</p>
        {d.logs.length === 0 ? <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công.</p> : (
          <div className="divide-y divide-gray-50">
            {d.logs.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-gray-700">{new Date(l.date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</p>
                  <p className="text-[11px] text-gray-400">{l.companyName}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600 text-xs">Vào {hhmm(l.checkInAt)} · Ra {hhmm(l.checkOutAt)}</p>
                  {l.minutesLate > 0 ? <p className="text-[11px] text-amber-600">Trễ {l.minutesLate} phút</p> : <p className="text-[11px] text-green-600">Đúng giờ</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── TAB NGHỈ PHÉP (riêng tư) ───────────
function LeaveTab() {
  const [d, setD] = useState<{ leaveBalance: number; requests: { id: string; typeLabel: string; fromDate: string; toDate: string; days: number; reason: string | null; status: string; note: string | null; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/leave").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>;
  const badge = (s: string) => s === "approved" ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Đã duyệt</span>
    : s === "rejected" ? <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} /> Từ chối</span>
    : <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={11} /> Chờ duyệt</span>;
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><Umbrella size={24} /></div>
        <div><p className="text-3xl font-extrabold">{d.leaveBalance}<span className="text-base font-semibold text-blue-200"> ngày</span></p><p className="text-sm text-blue-100">Phép năm còn lại</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Đơn nghỉ phép</p>
        {d.requests.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có đơn nào. Xin nghỉ tại kiosk công ty (quét mặt).</p>
        ) : (
          <div className="space-y-2.5">
            {d.requests.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{r.typeLabel} · {r.days} ngày</p>
                  {badge(r.status)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(r.fromDate).toLocaleDateString("vi-VN")} → {new Date(r.toDate).toLocaleDateString("vi-VN")}</p>
                {r.reason && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.reason}</p>}
                {r.note && <p className="text-[11px] text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">Sếp: {r.note}</p>}
              </div>
            ))}
          </div>
        )}
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
function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mx-auto mb-1.5">{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-blue-100 mt-0.5">{label}</p>
    </div>
  );
}
