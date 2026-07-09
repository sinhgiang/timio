"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle, Facebook, Globe,
  Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2, Wallet, Umbrella, IdCard, LogOut,
  XCircle, Camera, Pencil, Plus, X, Award, Lock, Users, Sparkles, Handshake, Bell, FileText, Send,
  CalendarDays, Receipt, GraduationCap, Package, Megaphone, Settings,
} from "lucide-react";
import AdvanceCard from "@/components/worker/AdvanceCard";
import JobPicker from "@/components/JobPicker";
import { VN_REGIONS, AREA_REMOTE, AREA_ANYWHERE } from "@/lib/vnLocations";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

type Social = { phone: string | null; email: string | null; zalo: string | null; website: string | null; facebook: string | null };
type Trust = { score: number | null; level: "new" | "bronze" | "silver" | "gold"; levelLabel: string; parts: { punctuality: number; consistency: number; tenure: number } };
type Settings = { profilePublic: boolean; shareTrustScore: boolean; shareContact: boolean; shareEmail: boolean; shareZalo: boolean; shareWebsite: boolean; shareFacebook: boolean; openToWork: boolean; autoAcceptRecruiters: boolean; desiredArea: string | null; desiredPosition: string | null; keywords: string | null };
type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };
type Profile = {
  handle: string | null; isOwner: boolean; private?: boolean; hideTrust?: boolean; hideContact?: boolean;
  name: string; avatarUrl: string | null; coverUrl: string | null; bio: string | null;
  role: string; department: string | null; companyName: string | null; location: string; tags: string[];
  socials: Social;
  verified: { experienceMonths: number; totalDaysWorked: number; punctualityRate: number | null; companiesCount: number };
  trust: Trust;
  settings?: Settings;
  experiences: { companyName: string; position: string; department: string | null; branchName: string | null; joinDate: string | null; active: boolean; monthsHere: number | null }[];
};

function expLabel(months: number): string {
  if (months <= 0) return "Mới bắt đầu";
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} tháng`;
  if (m === 0) return `${y} năm`;
  return `${y} năm ${m} tháng`;
}

// Đọc file ảnh -> resize -> dataURL (square=true để crop vuông cho avatar)
function fileToDataUrl(file: File, maxW: number, square = false, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (square) {
          const s = Math.min(img.width, img.height);
          canvas.width = maxW; canvas.height = maxW;
          ctx?.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, maxW, maxW);
        } else {
          const scale = Math.min(1, maxW / img.width);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type TabKey = "profile" | "attendance" | "shifts" | "requests" | "leave" | "payslip" | "income" | "certificates" | "assets" | "reviews" | "announcements" | "trust" | "settings";

const NAV_ITEMS: { key: TabKey; label: string; Icon: typeof IdCard }[] = [
  { key: "profile", label: "Hồ sơ của tôi", Icon: IdCard },
  { key: "attendance", label: "Chấm công", Icon: Clock },
  { key: "shifts", label: "Lịch ca", Icon: CalendarDays },
  { key: "requests", label: "Đơn từ", Icon: FileText },
  { key: "leave", label: "Nghỉ phép", Icon: Umbrella },
  { key: "payslip", label: "Phiếu lương", Icon: Receipt },
  { key: "income", label: "Tạm ứng lương (EWA)", Icon: Wallet },
  { key: "certificates", label: "Chứng chỉ & đào tạo", Icon: GraduationCap },
  { key: "assets", label: "Tài sản được giao", Icon: Package },
  { key: "reviews", label: "Đánh giá của tôi", Icon: Star },
  { key: "announcements", label: "Bảng tin công ty", Icon: Megaphone },
  { key: "trust", label: "Điểm tin cậy & tìm việc", Icon: ShieldCheck },
  { key: "settings", label: "Cài đặt & riêng tư", Icon: Settings },
];
const NAV_GROUPS: { section: string | null; keys: TabKey[] }[] = [
  { section: null, keys: ["profile"] },
  { section: "Chấm công của tôi", keys: ["attendance", "shifts", "requests", "leave"] },
  { section: "Lương của tôi", keys: ["payslip", "income"] },
  { section: "Công việc", keys: ["certificates", "assets", "reviews", "announcements"] },
  { section: "Định danh & nghề nghiệp", keys: ["trust", "settings"] },
];
const navItem = (k: TabKey) => NAV_ITEMS.find((i) => i.key === k)!;

export default function HoSoPage({ params }: { params: { handle: string } }) {
  const router = useRouter();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<TabKey>("profile");
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

  const logout = async () => { await fetch("/api/worker/logout", { method: "POST" }).catch(() => {}); router.push("/nhanvien"); };
  const share = () => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;
  if (notFound || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3"><IdCard size={26} className="text-gray-400" /></div>
      <p className="text-gray-700 font-semibold">Không tìm thấy hồ sơ này</p>
      <p className="text-sm text-gray-400 mt-1">Liên kết có thể sai hoặc đã đổi.</p>
    </div>
  );

  // Hồ sơ riêng tư (người khác xem, NV chưa bật công khai)
  if (data.private) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-blue-50 to-gray-50">
      <div className="w-20 h-20 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-4">
        {data.avatarUrl ? <img src={data.avatarUrl} alt={data.name} className="w-full h-full rounded-full object-cover" /> : <Lock size={26} className="text-gray-400" />}
      </div>
      <p className="text-gray-800 font-semibold text-lg">{data.name}</p>
      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5"><Lock size={13} /> Hồ sơ này đang ở chế độ riêng tư.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Cả khối (menu + hồ sơ) canh giữa màn hình như Facebook/LinkedIn */}
      <div className="mx-auto max-w-6xl md:flex md:items-start">
        {/* ── Sidebar trái (desktop, chính chủ) ── */}
        {data.isOwner && (
          <aside className="hidden md:flex md:flex-col w-56 shrink-0 md:sticky md:top-0 md:h-screen bg-white border-r border-gray-100">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50 bg-gradient-to-b from-blue-50/60 to-transparent">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0"><Building2 size={18} /></div>
              <div className="min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate leading-tight">{data.companyName || "Chưa có công ty"}</p>
                <p className="text-[11px] text-gray-500 truncate">{data.name} · {data.role}</p>
              </div>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {NAV_GROUPS.map((g) => (
                <div key={g.section ?? "top"}>
                  {g.section && <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none">{g.section}</p>}
                  {g.keys.map((k) => {
                    const it = navItem(k); const active = tab === k;
                    return (
                      <button key={k} onClick={() => setTab(k)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}>
                        <it.Icon size={16} strokeWidth={active ? 2.4 : 2} className="shrink-0" /> <span className="truncate">{it.label}</span>
                        {k === "trust" && <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">MỚI</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="p-2 border-t border-gray-50">
              <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50"><LogOut size={17} /> Đăng xuất</button>
            </div>
          </aside>
        )}

        {/* ── Nội dung chính ── */}
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 md:hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0"><Building2 size={16} /></div>
                <span className="font-semibold text-gray-800 text-sm truncate">{data.companyName || data.name}</span>
              </div>
              <span className="hidden md:block font-semibold text-gray-700 text-sm">{navItem(tab).label}</span>
              <div className="flex items-center gap-2">
                {data.isOwner && <NotificationBell onNavigate={setTab} />}
                <button onClick={share} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-full px-3 py-1.5 hover:bg-blue-700 transition-colors"><Share2 size={13} /> {copied ? "Đã chép" : "Chia sẻ"}</button>
                {data.isOwner && <button onClick={logout} title="Đăng xuất" className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100"><LogOut size={17} /></button>}
              </div>
            </div>
            {/* Tab ngang (mobile, chính chủ) */}
            {data.isOwner && (
              <div className="md:hidden max-w-2xl mx-auto px-2 flex gap-1 overflow-x-auto">
                {NAV_ITEMS.map((t) => {
                  const active = tab === t.key;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-400"}`}>
                      <t.Icon size={15} /> {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="max-w-2xl mx-auto px-4 py-5">
            {tab === "profile" && <ProfileTab data={data} onChange={setData} />}
            {tab === "requests" && data.isOwner && <RequestsTab />}
            {tab === "shifts" && data.isOwner && <ShiftsTab />}
            {tab === "payslip" && data.isOwner && <PayslipTab />}
            {tab === "income" && data.isOwner && <IncomeTab />}
            {tab === "attendance" && data.isOwner && <AttendanceTab onNew={() => setTab("requests")} />}
            {tab === "leave" && data.isOwner && <LeaveTab onNew={() => setTab("requests")} />}
            {tab === "certificates" && data.isOwner && <CertificatesTab />}
            {tab === "assets" && data.isOwner && <AssetsTab />}
            {tab === "reviews" && data.isOwner && <ReviewsTab />}
            {tab === "announcements" && data.isOwner && <AnnouncementsTab />}
            {tab === "trust" && data.isOwner && <TrustTab data={data} onChange={setData} />}
            {tab === "settings" && data.isOwner && <SettingsTab data={data} onChange={setData} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────── TAB HỒ SƠ (kiểu Facebook, sửa được) ───────────
function ProfileTab({ data, onChange }: { data: Profile; onChange: (p: Profile) => void }) {
  const v = data.verified;
  const firstName = data.name.trim().split(/\s+/).pop() || data.name;
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const patch = async (payload: Record<string, string | null>) => {
    setBusy(true);
    try {
      const r = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) { const p = await r.json(); onChange({ ...p, isOwner: true }); }
    } catch { /* */ }
    setBusy(false);
  };

  const onCover = async (f?: File) => { if (!f) return; const url = await fileToDataUrl(f, 1200, false); patch({ coverUrl: url }); };
  const onAvatar = async (f?: File) => { if (!f) return; const url = await fileToDataUrl(f, 400, true); patch({ avatarUrl: url }); };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* Banner */}
        <div className="relative h-36 sm:h-52 rounded-t-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600">
          {data.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverUrl} alt="Ảnh bìa" className="w-full h-full object-cover" />
          )}
          {data.isOwner && (
            <>
              <button onClick={() => coverRef.current?.click()} disabled={busy}
                className="absolute right-3 bottom-3 flex items-center gap-1.5 text-xs bg-white/90 hover:bg-white text-gray-700 rounded-full px-3 py-1.5 shadow disabled:opacity-50">
                <Camera size={14} /> Sửa ảnh bìa
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onCover(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}
        </div>

        {/* Avatar + tên */}
        <div className="px-5 sm:px-8 pb-5">
          <div className="flex items-end gap-4 -mt-12 sm:-mt-14">
            <div className="relative shrink-0">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white bg-white" />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl font-serif ring-4 ring-white">{firstName[0]}</div>
              )}
              {data.isOwner && (
                <>
                  <button onClick={() => avatarRef.current?.click()} disabled={busy}
                    className="absolute right-0 bottom-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow ring-2 ring-white hover:bg-blue-700 disabled:opacity-50"><Camera size={14} /></button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onAvatar(e.target.files?.[0]); e.target.value = ""; }} />
                </>
              )}
            </div>
            {data.isOwner && (
              <button onClick={() => setEditOpen(true)} className="ml-auto mb-1 flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                <Pencil size={14} /> Chỉnh sửa
              </button>
            )}
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl sm:text-3xl text-gray-900 leading-tight">{data.name}</h1>
              <VerifiedBadge name={data.name} verified={v} />
            </div>
            <p className="text-gray-500 text-sm mt-0.5">{data.role}{data.companyName ? <> · {data.companyName}</> : null}</p>
            {data.bio && <p className="text-sm text-gray-600 mt-2">{data.bio}</p>}
          </div>

          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {data.tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100"><Star size={11} className="fill-current opacity-60" /> {tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liên hệ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Thông tin liên hệ</p>
          {data.isOwner && <button onClick={() => setEditOpen(true)} className="text-xs text-blue-600 flex items-center gap-1"><Pencil size={12} /> Sửa</button>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <ContactRow icon={<Phone size={15} />} label="Điện thoại" value={data.socials.phone} href={data.socials.phone ? `tel:${data.socials.phone}` : undefined} />
          <ContactRow icon={<MessageCircle size={15} />} label="Zalo" value={data.socials.zalo} href={data.socials.zalo ? (data.socials.zalo.startsWith("http") ? data.socials.zalo : `https://zalo.me/${data.socials.zalo.replace(/\D/g, "")}`) : undefined} isOwner={data.isOwner} onAdd={() => setEditOpen(true)} />
          <ContactRow icon={<Globe size={15} />} label="Website" value={data.socials.website} href={data.socials.website ? (data.socials.website.startsWith("http") ? data.socials.website : `https://${data.socials.website}`) : undefined} isOwner={data.isOwner} onAdd={() => setEditOpen(true)} />
          <ContactRow icon={<Facebook size={15} />} label="Facebook" value={data.socials.facebook} href={data.socials.facebook ? (data.socials.facebook.startsWith("http") ? data.socials.facebook : `https://facebook.com/${data.socials.facebook}`) : undefined} isOwner={data.isOwner} onAdd={() => setEditOpen(true)} />
          <ContactRow icon={<Mail size={15} />} label="Email" value={data.socials.email} href={data.socials.email ? `mailto:${data.socials.email}` : undefined} />
          <ContactRow icon={<MapPin size={15} />} label="Địa điểm" value={data.location} />
        </div>
      </div>

      {/* Điểm tin cậy — người NGOÀI xem thấy ở đây; chính chủ xem/chỉnh ở tab "Điểm tin cậy & tìm việc" */}
      {!data.isOwner && !data.hideTrust && <TrustCard trust={data.trust} verified={v} isOwner={false} />}

      {/* Được Timio xác thực */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-5 text-white">
        <div className="flex items-center gap-2 mb-4"><ShieldCheck size={18} /><p className="text-sm font-semibold">Được Timio xác thực</p><span className="text-[11px] text-blue-200">· từ dữ liệu chấm công thật</span></div>
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
                    {e.active ? <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Đang làm</span> : <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Đã nghỉ</span>}
                  </div>
                  <p className="text-xs text-gray-500">{e.companyName}{e.branchName ? ` · ${e.branchName}` : ""}{e.department ? ` · ${e.department}` : ""}</p>
                  {e.monthsHere != null && <p className="text-[11px] text-gray-400 mt-0.5">{expLabel(e.monthsHere)}{e.joinDate ? ` · từ ${new Date(e.joinDate).toLocaleDateString("vi-VN", { month: "2-digit", year: "numeric" })}` : ""}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {editOpen && <EditModal data={data} onClose={() => setEditOpen(false)} onSaved={(p) => { onChange({ ...p, isOwner: true }); setEditOpen(false); }} />}
    </div>
  );
}

// ─────────── Chuông thông báo (như Facebook/Zalo) ───────────
function notifIcon(type: string) {
  if (type === "recruiter") return <Handshake size={15} className="text-emerald-600" />;
  if (type === "leave") return <Umbrella size={15} className="text-blue-600" />;
  if (type === "correction") return <Clock size={15} className="text-blue-600" />;
  if (type === "advance" || type === "salary") return <Wallet size={15} className="text-green-600" />;
  return <Bell size={15} className="text-blue-600" />;
}
function NotificationBell({ onNavigate }: { onNavigate: (tab: TabKey) => void }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prev = useRef<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const ting = useCallback(() => {
    try {
      let ctx = ctxRef.current;
      if (!ctx) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; ctx = new AC(); ctxRef.current = ctx; }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const t0 = ctx.currentTime;
      ([[880, 0], [1320, 0.09]] as [number, number][]).forEach(([f, t]) => {
        const o = ctx!.createOscillator(), g = ctx!.createGain();
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(ctx!.destination);
        g.gain.setValueAtTime(0.0001, t0 + t); g.gain.exponentialRampToValueAtTime(0.14, t0 + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.32);
        o.start(t0 + t); o.stop(t0 + t + 0.36);
      });
    } catch { /* */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/worker/notifications");
      if (r.ok) {
        const d = await r.json();
        setItems(d.items || []); setUnread(d.unread || 0);
        if (prev.current !== null && d.unread > prev.current) { ting(); setPulse(true); setTimeout(() => setPulse(false), 1200); }
        prev.current = d.unread;
      }
    } catch { /* */ }
  }, [ting]);
  useEffect(() => { load(); const t = setInterval(load, 45000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);

  const clickItem = async (it: Notif) => {
    if (!it.read) await fetch("/api/worker/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id }) }).catch(() => {});
    setOpen(false);
    onNavigate((["income", "attendance", "leave"].includes(it.link || "") ? it.link : "profile") as TabKey);
    load();
  };
  const markAll = async () => { await fetch("/api/worker/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => {}); load(); };
  const timeAgo = (iso: string) => { const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return "vừa xong"; if (s < 3600) return `${Math.floor(s / 60)} phút`; if (s < 86400) return `${Math.floor(s / 3600)} giờ`; return `${Math.floor(s / 86400)} ngày`; };

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Thông báo" className={`relative p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors ${pulse ? "animate-bounce" : ""}`}>
        <Bell size={19} className={unread > 0 ? "text-blue-600" : ""} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="font-semibold text-gray-800 text-sm">Thông báo</p>
            {unread > 0 && <button onClick={markAll} className="text-[11px] text-blue-600 hover:underline">Đánh dấu đã đọc</button>}
          </div>
          {items.length === 0 ? (
            <div className="py-10 text-center text-gray-400"><Bell size={26} className="mx-auto mb-2 text-gray-200" /><p className="text-sm">Chưa có thông báo</p></div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((it) => (
                <button key={it.id} onClick={() => clickItem(it)} className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${it.read ? "" : "bg-blue-50/40"}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">{notifIcon(it.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 font-medium leading-snug">{it.title}</p>
                    {it.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{it.body}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(it.createdAt)} trước{it.read ? "" : " · mới"}</p>
                  </div>
                  {!it.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────── Điểm tin cậy (trung tâm) ───────────
function TrustCard({ trust, verified, isOwner }: { trust: Trust; verified: Profile["verified"]; isOwner: boolean }) {
  const score = trust.score;
  const pct = score ?? 0;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200"><Award size={16} className="text-white" /></div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Điểm tin cậy Timio</p>
            <p className="text-[11px] text-gray-400">Từ chấm công thật — {isOwner ? "mang đi xin việc, ứng lương tốt hơn" : "không tự khai"}</p>
          </div>
        </div>
        <LevelBadge level={trust.level} label={trust.levelLabel} />
      </div>

      {score === null ? (
        <p className="text-sm text-gray-400 py-2">Chưa đủ dữ liệu chấm công. Đi làm đều để bắt đầu xây điểm tin cậy.</p>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-extrabold leading-none bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 bg-clip-text text-transparent">{score}</p>
            <p className="text-sm text-gray-300 font-semibold mb-1">/100</p>
          </div>
          <div className="h-2.5 bg-blue-50 rounded-full overflow-hidden mt-3">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-500 to-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.45)] transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <TrustPart label="Đúng giờ" value={trust.parts.punctuality} max={50} />
            <TrustPart label="Chuyên cần" value={trust.parts.consistency} max={25} />
            <TrustPart label="Gắn bó" value={trust.parts.tenure} max={25} />
          </div>
          {isOwner && (
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-start gap-2">
              <Sparkles size={14} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                {(verified.punctualityRate ?? 0) >= 95 ? "Tuyệt vời! Giữ phong độ để duy trì hạng cao." : "Đi làm đúng giờ để tăng phần điểm lớn nhất."} Điểm cao giúp bạn được <b className="text-gray-700">ưu tiên tuyển</b> và <b className="text-gray-700">ứng lương nhiều hơn</b>.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
// Huy hiệu hạng nổi bật: gradient + sao (Đồng 1★ · Bạc 2★ · Vàng 3★)
const LEVEL_BADGE: Record<string, { grad: string; glow: string; stars: number }> = {
  gold:   { grad: "from-amber-400 to-yellow-500",  glow: "shadow-amber-300/60",  stars: 3 },
  silver: { grad: "from-sky-400 to-indigo-500",    glow: "shadow-indigo-200/60", stars: 2 },
  bronze: { grad: "from-orange-400 to-amber-500",  glow: "shadow-orange-200/60", stars: 1 },
  new:    { grad: "from-gray-300 to-gray-400",     glow: "shadow-gray-200/50",   stars: 0 },
};
function LevelBadge({ level, label }: { level: string; label: string }) {
  const b = LEVEL_BADGE[level] ?? LEVEL_BADGE.new;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r ${b.grad} shadow-md ${b.glow}`}>
      {Array.from({ length: b.stars }).map((_, i) => <Star key={i} size={10} className="fill-white text-white" />)}
      {label}
    </span>
  );
}
function TrustPart({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1"><span className="text-[11px] text-gray-500">{label}</span><span className="text-[10px] text-gray-400">{value}/{max}</span></div>
      <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-sky-300 to-blue-500" style={{ width: `${(value / max) * 100}%` }} /></div>
    </div>
  );
}

// ─────────── Nhà tuyển dụng quan tâm (GĐ2 inbox + nút gạt cho phép mọi NTD) ───────────
function ConnectionsCard({ data, onChange }: { data: Profile; onChange: (p: Profile) => void }) {
  const auto = data.settings!.autoAcceptRecruiters;
  const [conns, setConns] = useState<{ id: string; companyName: string; note: string | null; status: string }[]>([]);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [savingAuto, setSavingAuto] = useState(false);
  const load = useCallback(async () => {
    try { const r = await fetch("/api/worker/connections"); if (r.ok) { const d = await r.json(); setConns(d.connections || []); } } catch { /* */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  const respond = async (id: string, action: "accept" | "decline") => {
    setActing((p) => ({ ...p, [id]: true }));
    await fetch(`/api/worker/connections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).catch(() => {});
    await load();
    setActing((p) => ({ ...p, [id]: false }));
  };
  const toggleAuto = async (v: boolean) => {
    setSavingAuto(true);
    try { const r = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoAcceptRecruiters: v }) }); if (r.ok) onChange({ ...(await r.json()), isOwner: true }); } catch { /* */ }
    setSavingAuto(false);
  };
  const pending = conns.filter((c) => c.status === "pending");
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0"><Handshake size={17} className="text-emerald-600" /></div>
          <p className="text-sm font-semibold text-gray-800 truncate">Nhà tuyển dụng quan tâm {pending.length > 0 && <span className="text-emerald-600">· {pending.length} mới</span>}</p>
        </div>
        {/* Nút gạt nhỏ: cho mọi NTD liên hệ */}
        <button onClick={() => !savingAuto && toggleAuto(!auto)} disabled={savingAuto} title={auto ? "Đang bật: mọi nhà tuyển dụng thấy SĐT ngay. Bấm để tắt (tự chọn từng người)." : "Đang tắt: bạn tự chọn từng người. Bấm để cho mọi nhà tuyển dụng liên hệ."} className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-gray-500 hidden sm:inline">Cho mọi nhà tuyển dụng liên hệ</span>
          <span className={`relative w-9 h-5 rounded-full transition-colors ${auto ? "bg-emerald-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${auto ? "translate-x-4" : ""}`} />
          </span>
        </button>
      </div>

      {conns.length === 0 ? (
        <p className="text-sm text-gray-400 py-3 text-center">Chưa có nhà tuyển dụng nào quan tâm. Bật <b>&quot;Đang tìm việc&quot;</b> để được mời.</p>
      ) : (
        <div className="space-y-2.5">
          {conns.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Building2 size={17} className="text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.companyName}</p>
                <p className="text-[11px] text-gray-400 truncate">{c.note || "Muốn kết nối với bạn"}</p>
              </div>
              {c.status === "pending" ? (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => respond(c.id, "accept")} disabled={acting[c.id]} className="px-2.5 py-1.5 text-[11px] font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Cho phép liên hệ</button>
                  <button onClick={() => respond(c.id, "decline")} disabled={acting[c.id]} className="px-2.5 py-1.5 text-[11px] text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Bỏ qua</button>
                </div>
              ) : c.status === "accepted" ? (
                <span className="text-[11px] text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0">Đã cho phép</span>
              ) : (
                <span className="text-[11px] text-gray-400 shrink-0">Đã bỏ qua</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!auto && (
        <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 font-medium">Riêng tư của bạn: chỉ khi bạn <b>bấm &quot;Cho phép liên hệ&quot;</b>, nhà tuyển dụng mới thấy số điện thoại của bạn.</p>
        </div>
      )}
    </div>
  );
}

// ─────────── Cài đặt quyền riêng tư & tìm việc (opt-in, NV sở hữu) ───────────
function SettingsCard({ data, onChange }: { data: Profile; onChange: (p: Profile) => void }) {
  const s = data.settings!;
  const [saving, setSaving] = useState(false);
  const [editDesired, setEditDesired] = useState(false);
  const [dpos, setDpos] = useState(s.desiredPosition ?? "");
  const [darea, setDarea] = useState(s.desiredArea ?? "");
  const [dkw, setDkw] = useState<string[]>(() => (s.keywords || "").split(",").map((k) => k.trim()).filter(Boolean));
  const [kwInput, setKwInput] = useState("");
  const addKw = () => { const v = kwInput.trim().replace(/^#/, ""); if (v && !dkw.includes(v) && dkw.length < 10) setDkw([...dkw, v]); setKwInput(""); };
  const [editHandle, setEditHandle] = useState(false);
  const [handleInput, setHandleInput] = useState(data.handle ?? "");
  const [handleErr, setHandleErr] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const patch = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try { const r = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) onChange({ ...(await r.json()), isOwner: true }); } catch { /* */ }
    setSaving(false);
  };
  const saveHandle = async () => {
    setSavingHandle(true); setHandleErr("");
    try {
      const r = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: handleInput }) });
      const d = await r.json();
      if (!r.ok) { setHandleErr(d.error || "Không đổi được đường dẫn."); setSavingHandle(false); return; }
      window.location.href = `/ho-so/${d.handle}`; // URL đổi theo handle mới
    } catch { setHandleErr("Lỗi kết nối."); setSavingHandle(false); }
  };
  // Công tắc hiển thị cho từng liên hệ CÓ giá trị (đồng bộ với Thông tin liên hệ)
  const allContacts: { key: keyof Settings; label: string; icon: React.ReactNode; value: string | null }[] = [
    { key: "shareContact", label: "Hiện số điện thoại", icon: <Phone size={15} />, value: data.socials.phone },
    { key: "shareEmail", label: "Hiện email", icon: <Mail size={15} />, value: data.socials.email },
    { key: "shareZalo", label: "Hiện Zalo", icon: <MessageCircle size={15} />, value: data.socials.zalo },
    { key: "shareWebsite", label: "Hiện website", icon: <Globe size={15} />, value: data.socials.website },
    { key: "shareFacebook", label: "Hiện Facebook", icon: <Facebook size={15} />, value: data.socials.facebook },
  ];
  const contactToggles = allContacts.filter((c) => c.value);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1"><Lock size={16} className="text-gray-500" /><p className="text-sm font-semibold text-gray-800">Quyền riêng tư & tìm việc</p></div>
      <p className="text-[11px] text-gray-400 mb-3">Bạn toàn quyền quyết định chia sẻ gì. Mặc định riêng tư.</p>

      {/* Đường dẫn hồ sơ (username) — NV tự chọn kiểu Facebook */}
      <div className="mb-3 pb-3 border-b border-gray-50">
        {!editHandle ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-700 truncate min-w-0"><span className="text-gray-400">Đường dẫn: </span>timio.vn/ho-so/<b>{data.handle}</b></p>
            <button onClick={() => { setHandleInput(data.handle ?? ""); setHandleErr(""); setEditHandle(true); }} className="text-xs text-blue-600 flex items-center gap-1 shrink-0 hover:underline"><Pencil size={12} /> Đổi</button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">.../ho-so/</span>
              <input value={handleInput} onChange={(e) => setHandleInput(e.target.value)} placeholder="ten-cua-ban" className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
              <button onClick={saveHandle} disabled={savingHandle} className="text-xs font-medium bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 shrink-0">Lưu</button>
              <button onClick={() => setEditHandle(false)} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 shrink-0">Hủy</button>
            </div>
            {handleErr && <p className="text-[11px] text-red-500 mt-1">{handleErr}</p>}
            <p className="text-[10px] text-gray-400 mt-1">Chỉ chữ thường, số, dấu gạch. Công ty không sửa được — đây là của riêng bạn.</p>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <ToggleRow icon={<Globe size={15} />} title="Công khai hồ sơ" desc="Cho người có link xem hồ sơ của bạn" on={s.profilePublic} saving={saving} onToggle={(v) => patch({ profilePublic: v })} />
        <ToggleRow icon={<Award size={15} />} title="Hiện điểm tin cậy" desc="Cho nhà tuyển dụng thấy điểm tin cậy" on={s.shareTrustScore} saving={saving} disabled={!s.profilePublic} onToggle={(v) => patch({ shareTrustScore: v })} />
        {contactToggles.map((c) => (
          <ToggleRow key={c.key} icon={c.icon} title={c.label} desc={c.value ?? ""} on={s[c.key] as boolean} saving={saving} disabled={!s.profilePublic} onToggle={(v) => patch({ [c.key]: v })} />
        ))}
        <ToggleRow icon={<Sparkles size={15} />} title="Đang tìm việc" desc="Vào kho ứng viên xác thực để được mời" on={s.openToWork} saving={saving} onToggle={(v) => patch({ openToWork: v })} highlight />
      </div>

      {s.openToWork && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          {!editDesired ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 text-sm flex-1">
                <p className="text-gray-700 truncate"><span className="text-gray-400">Ngành nghề: </span>{s.desiredPosition || <span className="text-gray-300">Chưa chọn</span>}</p>
                <p className="text-gray-700 truncate mt-0.5"><span className="text-gray-400">Khu vực: </span>{s.desiredArea || <span className="text-gray-300">Chưa chọn</span>}</p>
                {s.keywords && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {s.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((k, i) => (
                      <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{k}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setDpos(s.desiredPosition ?? ""); setDarea(s.desiredArea ?? ""); setDkw((s.keywords || "").split(",").map((k) => k.trim()).filter(Boolean)); setEditDesired(true); }} className="text-xs text-blue-600 flex items-center gap-1 shrink-0 hover:underline"><Pencil size={12} /> Sửa</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Ngành nghề mong muốn</label>
                <JobPicker value={dpos} onChange={setDpos} placeholder="Chọn hoặc gõ để tìm nghề" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Khu vực mong muốn</label>
                <select value={darea} onChange={(e) => setDarea(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">— Chọn khu vực —</option>
                  <option value={AREA_ANYWHERE}>{AREA_ANYWHERE}</option>
                  <option value={AREA_REMOTE}>{AREA_REMOTE}</option>
                  {VN_REGIONS.map((r) => (
                    <optgroup key={r.label} label={r.label}>
                      {r.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Từ khóa (giúp nhà tuyển dụng tìm thấy bạn dễ hơn)</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {dkw.map((k, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">#{k}<button onClick={() => setDkw(dkw.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-600"><X size={11} /></button></span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }} placeholder="VD: chăm chỉ, biết tiếng Anh, chạy xe..." className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                  <button onClick={addKw} className="text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 hover:bg-blue-50">Thêm</button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Tối đa 10 từ khóa. Gắn kỹ năng/mong muốn để nhà tuyển dụng dễ tìm ra bạn.</p>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setEditDesired(false)} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">Hủy</button>
                <button onClick={async () => { await patch({ desiredPosition: dpos, desiredArea: darea, keywords: dkw.join(", ") }); setEditDesired(false); }} disabled={saving} className="text-xs font-medium bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50">Lưu</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ToggleRow({ icon, title, desc, on, onToggle, saving, disabled, highlight }: { icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: (v: boolean) => void; saving: boolean; disabled?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 ${disabled ? "opacity-50" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${highlight ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"}`}>{icon}</div>
      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800">{title}</p><p className="text-[11px] text-gray-400">{desc}</p></div>
      <button onClick={() => !disabled && !saving && onToggle(!on)} disabled={disabled || saving} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? (highlight ? "bg-emerald-500" : "bg-blue-600") : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

// Dấu tích xác thực (nổi bật kiểu Facebook/YouTube) + tooltip giải thích khi rê chuột / bấm vào
function VerifiedBadge({ name, verified }: { name: string; verified: Profile["verified"] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Hồ sơ đã xác thực" className="inline-flex focus:outline-none">
        <BadgeCheck size={26} className="fill-blue-500 text-white drop-shadow-[0_1px_3px_rgba(37,99,235,0.5)]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-3.5 z-30 text-left">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BadgeCheck size={17} className="fill-blue-500 text-white" />
            <p className="text-sm font-bold text-gray-800">Hồ sơ đã xác thực</p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Danh tính và kinh nghiệm làm việc của <b>{name}</b> được <b className="text-blue-600">Timio</b> chứng thực bằng <b>dữ liệu chấm công thật</b> — không phải thông tin tự khai.
          </p>
          <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck size={12} className="text-blue-500 shrink-0" />
            <span>{verified.totalDaysWorked} ngày công{verified.punctualityRate != null ? ` · ${verified.punctualityRate}% đúng giờ` : ""} được hệ thống ghi nhận.</span>
          </div>
        </div>
      )}
    </span>
  );
}

function ContactRow({ icon, label, value, href, isOwner, onAdd }: { icon: React.ReactNode; label: string; value: string | null; href?: string; isOwner?: boolean; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        {value ? (
          href ? <a href={href} target="_blank" rel="noreferrer" className="text-sm text-gray-800 truncate block hover:text-blue-600">{value}</a> : <p className="text-sm text-gray-800 truncate">{value}</p>
        ) : isOwner ? (
          <button onClick={onAdd} className="text-sm text-blue-500 flex items-center gap-1"><Plus size={12} /> Thêm</button>
        ) : <p className="text-sm text-gray-300">—</p>}
      </div>
    </div>
  );
}

function EditModal({ data, onClose, onSaved }: { data: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [bio, setBio] = useState(data.bio ?? "");
  const [zalo, setZalo] = useState(data.socials.zalo ?? "");
  const [website, setWebsite] = useState(data.socials.website ?? "");
  const [facebook, setFacebook] = useState(data.socials.facebook ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/worker/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bio, zalo, website, facebook }) });
      if (r.ok) { onSaved(await r.json()); return; }
    } catch { /* */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Chỉnh sửa hồ sơ</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Giới thiệu ngắn" value={bio} onChange={setBio} placeholder="VD: Kỹ thuật viên 3 năm kinh nghiệm, chăm chỉ, đúng giờ" textarea />
          <Field label="Zalo" value={zalo} onChange={setZalo} placeholder="Số Zalo hoặc link zalo.me/..." />
          <Field label="Website" value={website} onChange={setWebsite} placeholder="VD: yourname.com" />
          <Field label="Facebook" value={facebook} onChange={setFacebook} placeholder="Link facebook.com/... hoặc tên tài khoản" />
          <p className="text-[11px] text-gray-400">Số điện thoại và email do công ty quản lý; bạn tự thêm Zalo/Website/Facebook nếu muốn.</p>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin" /> : null} Lưu</button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" />
        : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />}
    </div>
  );
}

// ─────────── TAB THU NHẬP ───────────
function IncomeTab() {
  const [earn, setEarn] = useState<{ monthLabel: string; total: number; totalDaysWorked: number; companies: { companyName: string; daysWorked: number; earnedSoFar: number; daysToPayday: number }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/earnings").then((r) => r.ok ? r.json() : null).then(setEarn).catch(() => {}); }, []);
  const minDaysToPay = earn?.companies.length ? Math.min(...earn.companies.map((c) => c.daysToPayday)) : null;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><Wallet size={17} className="text-green-600" /></div><p className="text-sm font-semibold text-gray-700">Thu nhập đã kiếm {earn ? `· ${earn.monthLabel}` : ""}</p></div>
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

// ─────────── TAB CHẤM CÔNG ───────────
function AttendanceTab({ onNew }: { onNew: () => void }) {
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
      <button onClick={onNew} className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-100"><Pencil size={15} /> Thấy chấm công chưa đúng? Tạo đơn sửa</button>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Lịch sử gần đây</p>
        {d.logs.length === 0 ? <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công.</p> : (
          <div className="divide-y divide-gray-50">
            {d.logs.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div><p className="text-gray-700">{new Date(l.date).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}</p><p className="text-[11px] text-gray-400">{l.companyName}</p></div>
                <div className="text-right"><p className="text-gray-600 text-xs">Vào {hhmm(l.checkInAt)} · Ra {hhmm(l.checkOutAt)}</p>{l.minutesLate > 0 ? <p className="text-[11px] text-amber-600">Trễ {l.minutesLate} phút</p> : <p className="text-[11px] text-green-600">Đúng giờ</p>}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── TAB NGHỈ PHÉP ───────────
function LeaveTab({ onNew }: { onNew: () => void }) {
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
      <button onClick={onNew} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700"><Plus size={16} /> Tạo đơn nghỉ phép</button>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Đơn nghỉ phép</p>
        {d.requests.length === 0 ? <p className="text-sm text-gray-400">Chưa có đơn nào. Bấm <b>“Tạo đơn nghỉ phép”</b> ở trên để xin nghỉ ngay trong app — công ty sẽ nhận và duyệt.</p> : (
          <div className="space-y-2.5">
            {d.requests.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-800">{r.typeLabel} · {r.days} ngày</p>{badge(r.status)}</div>
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

// ─────────── TAB ĐƠN TỪ (tạo + theo dõi, đồng bộ với công ty) ───────────
type WReq = { id: string; kind: string; kindLabel: string; when: string; detail: string; status: string; note: string | null; companyName: string; createdAt: string };
type WCompany = { companyId: string; companyName: string };
const REQ_KINDS: { k: string; label: string; Icon: typeof FileText }[] = [
  { k: "leave", label: "Xin nghỉ phép", Icon: Umbrella },
  { k: "early_leave", label: "Xin về sớm", Icon: LogOut },
  { k: "correction", label: "Sửa chấm công", Icon: Clock },
  { k: "overtime", label: "Xin tăng ca", Icon: CalendarClock },
];
const INP = "w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white";
function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block mb-2.5"><span className="text-xs text-gray-500">{t}</span>{children}</label>;
}
function reqBadge(s: string) {
  return s === "approved" ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Đã duyệt</span>
    : s === "rejected" ? <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} /> Từ chối</span>
    : <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={11} /> Chờ duyệt</span>;
}

function RequestsTab() {
  const [d, setD] = useState<{ requests: WReq[]; companies: WCompany[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("leave");
  const [companyId, setCompanyId] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const load = async () => {
    try { const r = await fetch("/api/worker/requests"); if (r.ok) { const j = await r.json(); setD(j); setCompanyId((prev) => prev || j.companies?.[0]?.companyId || ""); } } catch { /* */ }
  };
  useEffect(() => { load(); }, []);

  const F = (k: string) => f[k] ?? "";
  const setField = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const corrType = F("type") || "check_in";

  const submit = async () => {
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/worker/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, companyId: companyId || undefined, ...f }) });
      const j = await r.json();
      if (r.ok && j.ok) { setOpen(false); setF({}); setToast("Đã gửi đơn — công ty sẽ nhận và duyệt."); setTimeout(() => setToast(""), 2800); load(); }
      else setErr(j.error || "Không gửi được.");
    } catch { setErr("Lỗi kết nối."); }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {toast && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-2.5">{toast}</div>}
      <button onClick={() => { setOpen(true); setErr(""); }} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700"><Plus size={16} /> Tạo đơn mới</button>

      {!d ? <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div> : d.requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <FileText size={30} className="text-gray-300 mx-auto mb-2" strokeWidth={1.4} />
          <p className="text-gray-500 text-sm">Bạn chưa có đơn nào.</p>
          <p className="text-gray-400 text-xs mt-1">Tạo đơn xin nghỉ, về sớm, sửa chấm công hoặc tăng ca — công ty sẽ nhận và duyệt, bạn theo dõi ngay tại đây.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {d.requests.map((r) => (
            <div key={`${r.kind}-${r.id}`} className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-gray-800">{r.kindLabel}</p>{reqBadge(r.status)}</div>
              <p className="text-xs text-gray-500 mt-0.5">{r.when}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.detail}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400"><Building2 size={11} /> {r.companyName}</div>
              {r.note && <p className="text-[11px] text-gray-600 mt-1.5 bg-gray-50 rounded px-2 py-1">Sếp: {r.note}</p>}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-gray-800">Tạo đơn mới</h3><button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {REQ_KINDS.map((k) => (
                <button key={k.k} onClick={() => { setKind(k.k); setErr(""); }} className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm text-left ${kind === k.k ? "border-blue-500 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}><k.Icon size={16} /> {k.label}</button>
              ))}
            </div>

            {d && d.companies.length > 1 && (
              <Lbl t="Công ty"><select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={INP}>{d.companies.map((c) => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}</select></Lbl>
            )}

            {kind === "leave" && (<>
              <Lbl t="Loại nghỉ"><select value={F("type") || "annual"} onChange={(e) => setField("type", e.target.value)} className={INP}><option value="annual">Nghỉ phép năm</option><option value="sick">Nghỉ ốm</option><option value="unpaid">Nghỉ không lương</option><option value="other">Khác</option></select></Lbl>
              <div className="grid grid-cols-2 gap-2"><Lbl t="Từ ngày"><input type="date" value={F("fromDate")} onChange={(e) => setField("fromDate", e.target.value)} className={INP} /></Lbl><Lbl t="Đến ngày"><input type="date" value={F("toDate")} onChange={(e) => setField("toDate", e.target.value)} className={INP} /></Lbl></div>
              <Lbl t="Lý do (tùy chọn)"><textarea rows={2} value={F("reason")} onChange={(e) => setField("reason", e.target.value)} className={INP} /></Lbl>
            </>)}
            {kind === "early_leave" && (<>
              <div className="grid grid-cols-2 gap-2"><Lbl t="Ngày"><input type="date" value={F("date")} onChange={(e) => setField("date", e.target.value)} className={INP} /></Lbl><Lbl t="Về lúc"><input type="time" value={F("leaveTime")} onChange={(e) => setField("leaveTime", e.target.value)} className={INP} /></Lbl></div>
              <Lbl t="Lý do (tùy chọn)"><textarea rows={2} value={F("reason")} onChange={(e) => setField("reason", e.target.value)} className={INP} /></Lbl>
            </>)}
            {kind === "correction" && (<>
              <div className="grid grid-cols-2 gap-2"><Lbl t="Ngày"><input type="date" value={F("date")} onChange={(e) => setField("date", e.target.value)} className={INP} /></Lbl><Lbl t="Loại"><select value={corrType} onChange={(e) => setField("type", e.target.value)} className={INP}><option value="check_in">Giờ vào</option><option value="check_out">Giờ ra</option><option value="both">Cả vào &amp; ra</option></select></Lbl></div>
              {(corrType === "check_in" || corrType === "both") && <Lbl t="Giờ vào đúng"><input type="time" value={F("requestedCheckIn")} onChange={(e) => setField("requestedCheckIn", e.target.value)} className={INP} /></Lbl>}
              {(corrType === "check_out" || corrType === "both") && <Lbl t="Giờ ra đúng"><input type="time" value={F("requestedCheckOut")} onChange={(e) => setField("requestedCheckOut", e.target.value)} className={INP} /></Lbl>}
              <Lbl t="Lý do (bắt buộc)"><textarea rows={2} value={F("reason")} onChange={(e) => setField("reason", e.target.value)} className={INP} /></Lbl>
            </>)}
            {kind === "overtime" && (<>
              <Lbl t="Ngày"><input type="date" value={F("date")} onChange={(e) => setField("date", e.target.value)} className={INP} /></Lbl>
              <div className="grid grid-cols-3 gap-2"><Lbl t="Bắt đầu"><input type="time" value={F("startTime")} onChange={(e) => setField("startTime", e.target.value)} className={INP} /></Lbl><Lbl t="Kết thúc"><input type="time" value={F("endTime")} onChange={(e) => setField("endTime", e.target.value)} className={INP} /></Lbl><Lbl t="Số giờ"><input type="number" step="0.5" min="0" value={F("hours")} onChange={(e) => setField("hours", e.target.value)} className={INP} /></Lbl></div>
              <Lbl t="Lý do (tùy chọn)"><textarea rows={2} value={F("reason")} onChange={(e) => setField("reason", e.target.value)} className={INP} /></Lbl>
            </>)}

            {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm">Hủy</button>
              <button onClick={submit} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5">{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Gửi đơn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── TAB ĐIỂM TIN CẬY & TÌM VIỆC (chính chủ) ───────────
function TrustTab({ data, onChange }: { data: Profile; onChange: (p: Profile) => void }) {
  return (
    <div className="space-y-4">
      <TrustCard trust={data.trust} verified={data.verified} isOwner={true} />
      {data.settings && <ConnectionsCard data={data} onChange={onChange} />}
    </div>
  );
}

// ─────────── TAB CÀI ĐẶT & RIÊNG TƯ (chính chủ) ───────────
function SettingsTab({ data, onChange }: { data: Profile; onChange: (p: Profile) => void }) {
  if (!data.settings) return null;
  return <div className="space-y-4"><SettingsCard data={data} onChange={onChange} /></div>;
}

function TabLoading() { return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>; }
function TabEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">{icon}<p className="text-gray-500 text-sm mt-2">{text}</p></div>;
}
const dmy = (s: string) => { try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; } };

// ─────────── TAB LỊCH CA ───────────
function ShiftsTab() {
  const [d, setD] = useState<{ shifts: { date: string; shiftLabel: string; checkIn: string; checkOut: string; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/shifts").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <TabLoading />;
  const todayStr = new Date().toISOString().slice(0, 10);
  return d.shifts.length === 0 ? <TabEmpty icon={<CalendarDays size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có lịch ca nào được phân." /> : (
    <div className="bg-white rounded-2xl border border-gray-100 p-2">
      <div className="divide-y divide-gray-50">
        {d.shifts.map((s, i) => {
          const rest = /nghỉ/i.test(s.shiftLabel);
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-3 ${s.date === todayStr ? "bg-blue-50/50 rounded-lg" : ""}`}>
              <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${rest ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>
                <span className="text-sm font-bold leading-none">{s.date.slice(8, 10)}</span><span className="text-[9px]">Th{parseInt(s.date.slice(5, 7))}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{new Date(s.date).toLocaleDateString("vi-VN", { weekday: "long" })} {s.date === todayStr && <span className="text-[10px] text-blue-600">· Hôm nay</span>}</p>
                <p className="text-xs text-gray-500">{s.companyName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${rest ? "text-gray-400" : "text-gray-800"}`}>{s.shiftLabel}</p>
                {!rest && <p className="text-[11px] text-gray-500">{s.checkIn} – {s.checkOut}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────── TAB PHIẾU LƯƠNG ───────────
function PayslipTab() {
  const [month, setMonth] = useState(() => { const n = new Date(Date.now() + 7 * 3600e3); return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}`; });
  const [companyId, setCompanyId] = useState("");
  const [d, setD] = useState<{ payslip: PaySlip | null; companies: { companyId: string; companyName: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  type PaySlip = { companyName: string; position: string; department: string; year: number; month: number; baseSalary: number; earnedBase: number; standardWorkDays: number; daysPresent: number; daysLate: number; daysAbsent: number; totalPenalty: number; totalReward: number; totalOvertimeAmount: number; allowances: { label: string; amount: number }[]; totalAllowances: number; grossIncome: number; bhxhEmployee: number; tncn: number; netTakeHome: number; hasData: boolean };
  useEffect(() => {
    setLoading(true);
    fetch(`/api/worker/payslip?month=${month}${companyId ? `&companyId=${companyId}` : ""}`).then((r) => r.ok ? r.json() : null).then((j) => { setD(j); if (j && !companyId && j.companies?.[0]) setCompanyId(j.companies[0].companyId); }).catch(() => {}).finally(() => setLoading(false));
  }, [month, companyId]);
  const p = d?.payslip;
  const Row = ({ l, v, strong, minus }: { l: string; v: number; strong?: boolean; minus?: boolean }) => (
    <div className={`flex justify-between py-1.5 text-sm ${strong ? "font-bold text-gray-900" : "text-gray-600"}`}><span>{l}</span><span className={minus ? "text-red-500" : strong ? "text-green-600" : ""}>{minus ? "−" : ""}{vnd(Math.abs(v))} đ</span></div>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        {d && d.companies.length > 1 && <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1">{d.companies.map((c) => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}</select>}
      </div>
      {loading ? <TabLoading /> : !p ? <TabEmpty icon={<Receipt size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có dữ liệu." /> : !p.hasData ? <TabEmpty icon={<Receipt size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text={`Chưa có phiếu lương tháng ${p.month}/${p.year}.`} /> : (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <p className="text-sm text-blue-100">Thực nhận · tháng {p.month}/{p.year}</p>
            <p className="text-3xl font-extrabold mt-1">{vnd(p.netTakeHome)}<span className="text-base font-semibold text-blue-200"> đ</span></p>
            <p className="text-xs text-blue-100 mt-1">{p.companyName}{p.position ? ` · ${p.position}` : ""}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Chi tiết</p>
            <Row l={`Lương theo ngày công (${p.daysPresent}/${p.standardWorkDays})`} v={p.earnedBase} />
            {p.allowances.map((a, i) => <Row key={i} l={`Phụ cấp: ${a.label}`} v={a.amount} />)}
            {p.totalOvertimeAmount > 0 && <Row l="Tăng ca (đã duyệt)" v={p.totalOvertimeAmount} />}
            {p.totalReward > 0 && <Row l="Thưởng" v={p.totalReward} />}
            {p.totalPenalty > 0 && <Row l={`Phạt (đi trễ ${p.daysLate} lần)`} v={p.totalPenalty} minus />}
            <div className="border-t border-gray-100 my-1" />
            <Row l="Tổng thu nhập" v={p.grossIncome} />
            {p.bhxhEmployee > 0 && <Row l="BHXH (NV đóng)" v={p.bhxhEmployee} minus />}
            {p.tncn > 0 && <Row l="Thuế TNCN" v={p.tncn} minus />}
            <div className="border-t border-gray-100 my-1" />
            <Row l="Thực nhận" v={p.netTakeHome} strong />
          </div>
          <p className="text-[11px] text-gray-400 text-center">Số liệu do công ty chốt. Thấy sai? Tạo đơn ở tab “Đơn từ”.</p>
        </>
      )}
    </div>
  );
}

// ─────────── TAB CHỨNG CHỈ & ĐÀO TẠO ───────────
function CertificatesTab() {
  const [d, setD] = useState<{ items: { id: string; name: string; issuer: string | null; issueDate: string | null; expiryDate: string | null; note: string | null; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/certificates").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <TabLoading />;
  return d.items.length === 0 ? <TabEmpty icon={<GraduationCap size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có chứng chỉ / khóa đào tạo nào." /> : (
    <div className="space-y-2.5">
      {d.items.map((c) => (
        <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><GraduationCap size={18} className="text-indigo-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{c.name}</p>
            {c.issuer && <p className="text-xs text-gray-500">{c.issuer}</p>}
            <p className="text-[11px] text-gray-400 mt-0.5">{c.issueDate ? `Cấp ${dmy(c.issueDate)}` : ""}{c.expiryDate ? ` · Hết hạn ${dmy(c.expiryDate)}` : ""} · {c.companyName}</p>
            {c.note && <p className="text-xs text-gray-500 mt-1">{c.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────── TAB TÀI SẢN ĐƯỢC GIAO ───────────
function AssetsTab() {
  const [d, setD] = useState<{ items: { id: string; code: string; name: string; category: string | null; status: string; note: string | null; assignedAt: string | null; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/assets").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <TabLoading />;
  return d.items.length === 0 ? <TabEmpty icon={<Package size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Bạn chưa được giao tài sản nào." /> : (
    <div className="space-y-2.5">
      {d.items.map((a) => (
        <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Package size={18} className="text-amber-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{a.name} <span className="text-xs text-gray-400 font-mono">{a.code}</span></p>
            <p className="text-[11px] text-gray-400 mt-0.5">{a.assignedAt ? `Nhận ${dmy(a.assignedAt)}` : ""} · {a.companyName}</p>
            {a.note && <p className="text-xs text-gray-500 mt-1">{a.note}</p>}
          </div>
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full h-fit">Đang giữ</span>
        </div>
      ))}
    </div>
  );
}

// ─────────── TAB ĐÁNH GIÁ CỦA TÔI ───────────
function ReviewsTab() {
  const [d, setD] = useState<{ items: { id: string; period: string; type: string; overallScore: number | null; selfScore: number | null; strengths: string | null; improvements: string | null; goals: string | null; status: string; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/reviews").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <TabLoading />;
  return d.items.length === 0 ? <TabEmpty icon={<Star size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có kỳ đánh giá nào." /> : (
    <div className="space-y-2.5">
      {d.items.map((r) => (
        <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Kỳ {r.period}</p>
            {r.overallScore != null && <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={14} className="fill-current" /> {r.overallScore}/5</span>}
          </div>
          <p className="text-[11px] text-gray-400">{r.companyName}{r.selfScore != null ? ` · Tự chấm: ${r.selfScore}/5` : ""}</p>
          {r.strengths && <p className="text-xs text-gray-600 mt-1.5"><b className="text-green-600">Điểm mạnh:</b> {r.strengths}</p>}
          {r.improvements && <p className="text-xs text-gray-600 mt-1"><b className="text-amber-600">Cần cải thiện:</b> {r.improvements}</p>}
          {r.goals && <p className="text-xs text-gray-600 mt-1"><b className="text-blue-600">Mục tiêu:</b> {r.goals}</p>}
        </div>
      ))}
    </div>
  );
}

// ─────────── TAB BẢNG TIN CÔNG TY ───────────
function AnnouncementsTab() {
  const [d, setD] = useState<{ items: { id: string; title: string; content: string; type: string; pinned: boolean; publishedAt: string; companyName: string }[] } | null>(null);
  useEffect(() => { fetch("/api/worker/announcements").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <TabLoading />;
  const cls = (t: string) => t === "urgent" ? "border-red-200 bg-red-50" : t === "warning" ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white";
  return d.items.length === 0 ? <TabEmpty icon={<Megaphone size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có tin nội bộ nào." /> : (
    <div className="space-y-2.5">
      {d.items.map((a) => (
        <div key={a.id} className={`border rounded-xl p-4 shadow-sm ${cls(a.type)}`}>
          <div className="flex items-center gap-2">
            {a.pinned && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">GHIM</span>}
            <p className="text-sm font-semibold text-gray-800">{a.title}</p>
          </div>
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
          <p className="text-[11px] text-gray-400 mt-2">{dmy(a.publishedAt)} · {a.companyName}</p>
        </div>
      ))}
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
