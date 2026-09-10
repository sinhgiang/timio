"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle, Facebook, Globe,
  Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2, Wallet, Umbrella, IdCard, LogOut, LogIn,
  XCircle, Camera, Pencil, Plus, X, Award, Lock, Users, Sparkles, Handshake, Bell, FileText, Send,
  CalendarDays, Receipt, GraduationCap, Package, Megaphone, Check, Gift, Ticket, StickyNote,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import AdvanceCard from "@/components/worker/AdvanceCard";
import JobPicker from "@/components/JobPicker";
import { WORKER_TAG_SUGGESTIONS } from "@/lib/tagSuggestions";
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

type TabKey = "profile" | "attendance" | "shifts" | "requests" | "leave" | "payslip" | "income" | "certificates" | "assets" | "reviews" | "announcements";

// Thứ tự mảng này quyết định thứ tự tab ngang trên điện thoại (xem "Tab ngang (mobile,
// chính chủ)" ở render bên dưới, dùng NAV_ITEMS.map trực tiếp). Theo yêu cầu user: đẩy
// "Bảng tin công ty" lên ĐẦU (trước cả "Hồ sơ của tôi") để vào app là thấy tin mới nhất
// ngay — CHỈ đổi thứ tự, không đổi tên/nội dung. Sidebar desktop lấy thứ tự riêng từ
// NAV_GROUPS[].keys bên dưới, không phụ thuộc thứ tự mảng này — user yêu cầu riêng cho
// sidebar desktop là đặt "Bảng tin công ty" NGAY DƯỚI "Hồ sơ của tôi" (không phải lên đầu
// tuyệt đối như mobile), nên đã đưa "announcements" vào chung nhóm đầu (section: null) với
// "profile" trong NAV_GROUPS, thay vì để cuối nhóm "Công việc" như trước.
const NAV_ITEMS: { key: TabKey; label: string; Icon: typeof IdCard }[] = [
  { key: "announcements", label: "Bảng tin công ty", Icon: Megaphone },
  { key: "profile", label: "Hồ sơ của tôi", Icon: IdCard },
  { key: "attendance", label: "Chấm công", Icon: Clock },
  { key: "shifts", label: "Lịch ca", Icon: CalendarDays },
  { key: "requests", label: "Đơn xin", Icon: FileText },
  { key: "leave", label: "Nghỉ phép", Icon: Umbrella },
  { key: "payslip", label: "Phiếu lương", Icon: Receipt },
  { key: "income", label: "Tạm ứng lương (EWA)", Icon: Wallet },
  { key: "certificates", label: "Chứng chỉ & đào tạo", Icon: GraduationCap },
  { key: "assets", label: "Tài sản được giao", Icon: Package },
  { key: "reviews", label: "Đánh giá của tôi", Icon: Star },
];
const NAV_GROUPS: { section: string | null; keys: TabKey[] }[] = [
  { section: null, keys: ["profile", "announcements"] },
  { section: "Chấm công của tôi", keys: ["attendance", "shifts", "requests", "leave"] },
  { section: "Lương của tôi", keys: ["payslip", "income"] },
  { section: "Công việc", keys: ["certificates", "assets", "reviews"] },
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

      {/* Điểm tin cậy (trung tâm của hồ sơ) */}
      {(data.isOwner || !data.hideTrust) && <TrustCard trust={data.trust} verified={v} isOwner={!!data.isOwner} />}

      {/* Nhà tuyển dụng quan tâm (chính chủ) */}
      {data.isOwner && data.settings && <ConnectionsCard data={data} onChange={onChange} />}

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


      {/* Cài đặt quyền riêng tư & tìm việc (chính chủ) */}
      {data.isOwner && data.settings && <SettingsCard data={data} onChange={onChange} />}

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
                      <span key={i} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{k}</span>
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
                <label className="block text-[11px] text-gray-500 mb-1">Thẻ kỹ năng (giúp nhà tuyển dụng tìm thấy bạn dễ hơn)</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {dkw.map((k, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">{k}<button onClick={() => setDkw(dkw.filter((_, j) => j !== i))} className="text-blue-400 hover:text-blue-600"><X size={11} /></button></span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }} placeholder="VD: chăm chỉ, biết tiếng Anh, chạy xe..." className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                  <button onClick={addKw} className="text-xs font-medium text-blue-600 border border-blue-200 rounded-lg px-3 hover:bg-blue-50">Thêm</button>
                </div>
                {/* Gợi ý thẻ — bấm để thêm nhanh */}
                {dkw.length < 10 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">Gợi ý — bấm để thêm:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {WORKER_TAG_SUGGESTIONS.filter((t) => !dkw.includes(t)).slice(0, 14).map((t) => (
                        <button key={t} onClick={() => { if (dkw.length < 10 && !dkw.includes(t)) setDkw([...dkw, t]); }} className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 hover:border-blue-300 hover:text-blue-600 transition-colors">+ {t}</button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1.5">Tối đa 10 thẻ. Gắn kỹ năng/mong muốn để nhà tuyển dụng dễ tìm ra bạn.</p>
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
type WSess = { session: string; sessionLabel: string | null; checkInAt: string | null; checkOutAt: string | null; minutesLate: number; status: string; penaltyAmount: number; note: string | null };
type WDay = { date: string; employeeId: string; companyName: string; sessions: WSess[] };

function AttendanceTab({ onNew }: { onNew: () => void }) {
  const [d, setD] = useState<{ summary: { total: number; onTime: number; late: number }; days: WDay[] } | null>(null);
  useEffect(() => { fetch("/api/worker/attendance").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>;
  const hhmm = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
  // Trễ mà có bị trừ tiền (penaltyAmount > 0) thì hiện thẳng số tiền trừ ngay đây — khớp với dòng
  // "Phạt" tổng cộng ở tab Phiếu lương — để NV nhìn 1 cái là biết ngày nào bị trừ, trừ bao nhiêu.
  // Tách riêng badge (vàng cam) và số tiền (đỏ, dòng dưới) — để dùng chung 1 lưới cột nên các dòng
  // Sáng/Tối trong cùng 1 ngày thẳng hàng nhau, không lệch tuỳ độ dài chữ.
  const statusOf = (s: WSess): { text: string; cls: string; amount: string | null } => s.status === "holiday"
    ? { text: "Nghỉ lễ", cls: "bg-blue-50 text-blue-600", amount: null }
    : !s.checkInAt
      ? { text: "Vắng", cls: "bg-gray-100 text-gray-500", amount: null }
      : s.minutesLate > 0
        ? { text: `Trễ ${s.minutesLate} phút`, cls: "bg-amber-50 text-amber-600", amount: s.penaltyAmount > 0 ? `−${vnd(s.penaltyAmount)}đ` : null }
        : { text: "Đúng giờ", cls: "bg-green-50 text-green-600", amount: null };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center"><p className="text-2xl font-bold text-gray-800">{d.summary.total}</p><p className="text-xs text-gray-400">Ngày công</p></div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center"><p className="text-2xl font-bold text-green-700">{d.summary.onTime}</p><p className="text-xs text-green-600">Đúng giờ</p></div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{d.summary.late}</p><p className="text-xs text-amber-600">Đi trễ</p></div>
      </div>
      <button onClick={onNew} className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-600 bg-blue-50 rounded-xl py-2.5 text-sm font-medium hover:bg-blue-100"><Pencil size={15} /> Thấy chấm công chưa đúng? Tạo đơn sửa</button>
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Lịch sử gần đây</p>
        {d.days.length === 0 ? <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công.</p> : (
          <div className="space-y-3">
            {d.days.map((day, i) => {
              const multi = day.sessions.length > 1;
              return (
                <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5">
                    <p className="text-xs font-semibold text-gray-600">{new Date(day.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</p>
                    <p className="text-[11px] text-gray-400">{day.companyName}</p>
                  </div>
                  {/* Lưới 3 cột dùng chung cho mọi buổi trong ngày (nhãn buổi | giờ vào-ra | trạng thái+tiền)
                      — CSS Grid tự căn cột đều nhau giữa các buổi Sáng/Tối, không lệch như flex mỗi dòng riêng. */}
                  <div className="grid grid-cols-[auto_1fr_auto] gap-x-2.5 gap-y-2.5 px-3 py-2.5 text-sm">
                    {day.sessions.map((s, j) => {
                      const st = statusOf(s);
                      return (
                        <Fragment key={j}>
                          {multi ? (
                            <span className="self-center shrink-0 text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-md px-1.5 py-0.5">{s.sessionLabel ?? `Buổi ${j + 1}`}</span>
                          ) : <span />}
                          <span className="self-center text-gray-700 font-mono text-xs tabular-nums">
                            <span className="text-gray-400">Vào</span> {hhmm(s.checkInAt)} <span className="text-gray-300 mx-0.5">·</span> <span className="text-gray-400">Ra</span> {hhmm(s.checkOutAt)}
                          </span>
                          <div className="flex flex-col items-end justify-center gap-0.5">
                            <span className={`shrink-0 text-[11px] font-medium rounded-full px-2 py-0.5 ${st.cls}`}>{st.text}</span>
                            {st.amount && <span className="text-[11px] font-semibold text-red-500">{st.amount}</span>}
                          </div>
                          {/* Lý do khi sếp sửa tay chấm công (nay bắt buộc nhập) — hiện thẳng cho NV
                              thấy vì sao giờ vào/ra bị đổi, khỏi thắc mắc. Chiếm hết hàng (col-span-3)
                              vì lưới 3 cột trên chỉ đủ chỗ cho buổi/giờ/trạng thái. */}
                          {s.note && (
                            <p className="col-span-3 flex items-start gap-1 text-[11px] text-gray-400 -mt-1" title={s.note}>
                              <StickyNote size={11} className="shrink-0 mt-0.5" />
                              <span>{s.note}</span>
                            </p>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── ĐỢT NGHỈ LỄ (chọn ngày trong khoảng công ty cho phép) ───────────
type WHoliday = { id: string; companyId: string; employeeId: string | null; name: string; description?: string | null; mode: "fixed" | "flexible"; startDate: string; endDate: string; totalDays: number | null; maxDays: number | null; usedDates: string[] };

function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  // Trần 400 ngày (không phải 62 như trước) — từ khi "Nghỉ tự chọn" bỏ khai "Từ ngày"/"Đến ngày",
  // khoảng NV được chọn giờ có thể rộng gần hết 1 năm (xem /api/worker/holidays), 62 sẽ cắt cụt
  // mất nhiều tháng cuối năm.
  for (let i = 0; i < 400 && cur <= to; i++) {
    out.push(cur);
    const dt = new Date(`${cur}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    cur = dt.toISOString().slice(0, 10);
  }
  return out;
}

// Gộp các ngày đã chọn liền kề nhau thành 1 "khoảng" để hiện gọn thành 1 chip (VD chọn 2 ngày liền
// → 1 chip "08/09 → 09/09 · 2 ngày" thay vì 2 chip rời) — đúng ý user muốn thấy các đợt đã ghép
// (2 ngày liền, 3 ngày liền...) rõ ràng thay vì từng ngày lẻ.
function groupConsecutive(dates: string[]): string[][] {
  const sorted = [...dates].sort();
  const runs: string[][] = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (prev) {
      const nextExpected = new Date(`${prev}T00:00:00Z`);
      nextExpected.setUTCDate(nextExpected.getUTCDate() + 1);
      if (nextExpected.toISOString().slice(0, 10) === d) { last.push(d); continue; }
    }
    runs.push([d]);
  }
  return runs;
}

function HolidayPicker({ h, onSent }: { h: WHoliday; onSent: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  // Đang ở bước hỏi xác nhận "chọn ít hơn tối đa" (theo phản hồi user) — chỉ hiện khi NV bấm Gửi
  // trong lúc còn dư ngày chưa chọn, để họ biết rõ phần dư đó dồn qua đợt/lần khác chứ không mất.
  const [confirmUnder, setConfirmUnder] = useState(false);
  // Khoảng rộng (không dùng lưới nút): NV thêm từng ngày lẻ HOẶC 1 khoảng liền nhiều ngày trong 1
  // lần bấm "Thêm" (VD nghỉ 2 ngày liền), rồi lặp lại nhiều lần tới khi đủ số ngày được phép (theo
  // phản hồi user: "nghỉ 2 ngày liền nhau, xong lại chọn tiếp 1 ngày khác..."). "Đến ngày" bỏ trống
  // = chỉ thêm 1 ngày (giữ đúng hành vi thêm-từng-ngày cũ).
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const days = datesInRange(h.startDate, h.endDate);
  const limit = h.maxDays ?? 0;
  const availableSlots = Math.max(0, limit - h.usedDates.length); // tổng số ngày còn được chọn (kể cả đợt/đơn trước)
  const remaining = Math.max(0, availableSlots - picked.length);
  // Khoảng hẹp (≤40 ngày, VD đợt cũ còn khai "Từ ngày"/"Đến ngày" trước khi tính năng này đổi) →
  // vẫn hiện lưới nút bấm từng ngày như cũ, trực quan. Khoảng rộng gần cả năm (mặc định từ nay,
  // không khai khoảng nữa) → lưới ~300 nút là quá tải, đổi sang ô chọn ngày (input date) + thêm
  // từng ngày vào danh sách "chip" — gọn hơn nhiều cho khoảng rộng (theo yêu cầu tối ưu UI/UX).
  const useGrid = days.length <= 40;

  // Nếu chọn vượt quá số ngày công ty cho phép, báo rõ luôn (VD "chỉ được phép nghỉ 2 ngày, đã
  // chọn 3 ngày") thay vì im lặng không cho bấm thêm — NV dễ hiểu vì sao không chọn được nữa.
  const toggle = (d: string) => {
    if (h.usedDates.includes(d)) return;
    if (picked.includes(d)) { setErr(""); setConfirmUnder(false); setPicked(picked.filter((x) => x !== d)); return; }
    if (picked.length >= availableSlots) {
      setErr(`Bạn chỉ được phép nghỉ tối đa ${limit} ngày cho đợt này — bạn đã chọn ${picked.length + h.usedDates.length} ngày rồi, hãy bỏ bớt 1 ngày trước khi chọn ngày khác.`);
      return;
    }
    setErr(""); setConfirmUnder(false);
    setPicked([...picked, d]);
  };

  // "Chọn đủ N ngày" — cho NV chọn MỘT PHÁT toàn bộ số ngày còn được phép (thay vì phải bấm từng
  // ngày), lấy các ngày gần nhất còn trống trước; vẫn bấm lại để bỏ bớt nếu muốn nghỉ ít hơn
  // (theo phản hồi user: "chọn nghỉ riêng lẻ hoặc chọn một phát với số ngày tối đa đó luôn").
  const pickAll = () => {
    const free = days.filter((d) => !h.usedDates.includes(d));
    setPicked(free.slice(0, availableSlots));
    setErr(""); setConfirmUnder(false);
  };

  // Thêm 1 ngày HOẶC 1 khoảng nhiều ngày liền nhau (chế độ khoảng rộng, không dùng lưới nút) trong
  // 1 lần bấm "Thêm" — NV có thể lặp lại nhiều lần, mỗi lần 1 ngày lẻ hoặc 1 chuỗi liền nhau, cho
  // tới khi đủ số ngày được phép (VD: nghỉ 2 ngày liền, rồi thêm 1 ngày lẻ khác, rồi thêm 3 ngày
  // liền khác nữa). "Đến ngày" bỏ trống = chỉ thêm 1 ngày, giữ đúng hành vi cũ.
  const addRange = () => {
    if (!rangeFrom) return;
    if (rangeTo && rangeTo < rangeFrom) { setErr("Ngày kết thúc phải sau ngày bắt đầu."); return; }
    const from = rangeFrom;
    const to = rangeTo || rangeFrom;
    if (from < h.startDate || to > h.endDate) {
      setErr(`Chỉ được chọn ngày từ ${new Date(h.startDate).toLocaleDateString("vi-VN")} đến ${new Date(h.endDate).toLocaleDateString("vi-VN")}.`);
      return;
    }
    const range = datesInRange(from, to);
    const fresh = range.filter((d) => !h.usedDates.includes(d) && !picked.includes(d));
    if (fresh.length === 0) { setErr("Ngày/khoảng này đã được chọn hoặc đã dùng ở đơn khác rồi."); return; }
    if (picked.length + fresh.length > availableSlots) {
      setErr(`Bạn chỉ còn được chọn thêm ${remaining} ngày cho đợt này — khoảng vừa chọn có ${fresh.length} ngày mới, vượt quá số còn lại.`);
      return;
    }
    setErr(""); setConfirmUnder(false);
    setPicked([...picked, ...fresh].sort());
    setRangeFrom(""); setRangeTo("");
  };

  // Bỏ cả 1 "khoảng" đã gộp (chip nhiều ngày liền nhau) cùng lúc, thay vì phải bỏ từng ngày lẻ.
  const removeRun = (run: string[]) => {
    setErr(""); setConfirmUnder(false);
    setPicked(picked.filter((x) => !run.includes(x)));
  };

  // Không thu "Lý do" từ NV nữa (theo phản hồi user): mục đích đợt nghỉ đã được sếp khai rõ ở tên
  // đợt (h.name) khi tạo — NV không cần gõ lại lý do, danh sách đơn đã tự hiện kèm tên đợt rồi
  // (xem label ở GET /api/worker/requests).
  const doSend = async () => {
    setSending(true); setErr("");
    try {
      const r = await fetch("/api/worker/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "holiday", companyId: h.companyId, holidayId: h.id, dates: picked }),
      });
      const j = await r.json();
      if (r.ok && j.ok) { setPicked([]); setConfirmUnder(false); onSent(); }
      else setErr(j.error || "Không gửi được.");
    } catch { setErr("Lỗi kết nối."); }
    setSending(false);
  };

  // Chọn ÍT hơn số ngày tối đa được phép → hỏi xác nhận trước khi gửi thật, nhắc rõ phần ngày dư
  // ra dùng được ở đợt/lần khác (theo phản hồi user), tránh NV tưởng nhầm đơn này giữ chỗ luôn cho
  // cả phần chưa chọn. Chọn đủ rồi, hoặc đã xác nhận rồi thì gửi ngay.
  const send = () => {
    if (picked.length === 0) { setErr("Chọn ít nhất 1 ngày."); return; }
    if (!confirmUnder && picked.length < availableSlots) { setConfirmUnder(true); return; }
    doSend();
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-100 shadow-sm bg-white">
      {/* Đầu vé kiểu coupon — vạch đứt nét ngăn với phần chọn ngày bên dưới */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Ticket size={19} strokeWidth={1.5} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{h.name}</p>
          <p className="text-[11px] text-indigo-100">{new Date(h.startDate).toLocaleDateString("vi-VN")} → {new Date(h.endDate).toLocaleDateString("vi-VN")}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-extrabold leading-none">{remaining}<span className="text-xs font-semibold text-indigo-200">/{h.maxDays}</span></p>
          <p className="text-[10px] text-indigo-200 uppercase tracking-wide">ngày còn</p>
        </div>
      </div>
      {/* Mô tả chi tiết sếp khai khi tạo đợt lễ — hiện ngay để NV biết rõ đợt nghỉ này về việc gì
          trước khi chọn ngày (theo phản hồi user). */}
      {h.description && (
        <div className="px-3.5 pt-2.5 pb-1 bg-indigo-50/40 text-xs text-indigo-800/80 leading-relaxed">{h.description}</div>
      )}
      <div className="border-t border-dashed border-indigo-200 px-3.5 pt-3 pb-3.5 bg-indigo-50/40">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-gray-500 flex-1 min-w-[180px]">Công ty xếp cho bạn nghỉ <b className="text-gray-700">{h.maxDays} ngày</b> — chọn từng ngày lẻ, hoặc 1 khoảng nhiều ngày liền nhau, mỗi lần bấm Thêm:</p>
        {/* Chỉ hiện khi chưa tự chọn gì — bấm "Chọn đủ" sẽ THAY THẾ toàn bộ danh sách bằng bộ ngày
            tự động, nếu NV đã tự thêm tay trước đó thì ẩn đi để tránh mất lựa chọn oan. */}
        {availableSlots > 0 && picked.length === 0 && (
          <button type="button" onClick={pickAll} className="text-[11px] font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full hover:bg-indigo-200 shrink-0">
            ⚡ Chọn đủ {availableSlots} ngày 1 lần
          </button>
        )}
      </div>
      {useGrid ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {days.map((d) => {
            const used = h.usedDates.includes(d);
            const sel = picked.includes(d);
            return (
              <button
                key={d}
                type="button"
                disabled={used}
                onClick={() => toggle(d)}
                title={used ? "Đã chọn ngày này ở đơn khác (đang chờ/đã duyệt)" : d}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                  used ? "bg-gray-100 border-gray-200 text-gray-300 line-through cursor-not-allowed"
                  : sel ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                {new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
              </button>
            );
          })}
        </div>
      ) : availableSlots === 0 ? (
        // Đã dùng hết hạn mức từ trước (đơn khác đang chờ/đã duyệt) — báo rõ luôn, không cho thêm.
        <p className="mt-2.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Bạn đã dùng hết {limit} ngày cho đợt này (đang chờ duyệt hoặc đã duyệt) — không thể chọn thêm.
        </p>
      ) : (
        // Khoảng rộng gần cả năm — thay lưới ~300 nút bằng ô chọn Từ ngày/Đến ngày + thêm vào danh
        // sách "chip" (gộp các ngày liền nhau lại 1 chip), gọn và dễ dùng hơn nhiều trên điện thoại.
        // Để trống "Đến ngày" = thêm đúng 1 ngày; NV có thể lặp lại nhiều lần (1 ngày lẻ, rồi 2 ngày
        // liền, rồi lại 1 ngày lẻ khác...) tới khi đủ số ngày được phép.
        <div className="mt-2.5">
          <div className="flex flex-wrap gap-1.5 items-end">
            <div className="flex-1 min-w-[112px]">
              <label className="block text-[10px] text-gray-400 mb-0.5">Từ ngày</label>
              <input
                type="date"
                value={rangeFrom}
                min={h.startDate}
                max={h.endDate}
                disabled={remaining === 0}
                onChange={(e) => { setRangeFrom(e.target.value); if (rangeTo && rangeTo < e.target.value) setRangeTo(""); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-300 outline-none disabled:bg-gray-50 disabled:text-gray-300"
              />
            </div>
            <div className="flex-1 min-w-[112px]">
              <label className="block text-[10px] text-gray-400 mb-0.5">Đến ngày <span className="text-gray-300 font-normal">(tuỳ chọn)</span></label>
              <input
                type="date"
                value={rangeTo}
                min={rangeFrom || h.startDate}
                max={h.endDate}
                disabled={remaining === 0 || !rangeFrom}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-300 outline-none disabled:bg-gray-50 disabled:text-gray-300"
              />
            </div>
            <button
              type="button"
              onClick={addRange}
              disabled={!rangeFrom || remaining === 0}
              className="shrink-0 inline-flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40"
            >
              <Plus size={13} strokeWidth={2} /> Thêm
            </button>
          </div>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {groupConsecutive(picked).map((run) => (
                <span key={run[0]} className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-600 text-white pl-2.5 pr-1.5 py-1 rounded-lg">
                  {run.length === 1
                    ? new Date(run[0]).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                    : `${new Date(run[0]).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} → ${new Date(run[run.length - 1]).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} · ${run.length} ngày`}
                  <button type="button" onClick={() => removeRun(run)} className="hover:opacity-70" title="Bỏ khoảng này"><X size={12} strokeWidth={2.5} /></button>
                </span>
              ))}
            </div>
          )}
          {remaining === 0 && (
            <p className="text-[11px] text-indigo-500 mt-1.5">Đã chọn đủ {availableSlots} ngày — bấm Gửi đơn bên dưới, hoặc bỏ bớt 1 khoảng để đổi ngày khác.</p>
          )}
        </div>
      )}
      {/* Không hỏi "Lý do" nữa — mục đích đợt nghỉ đã hiện sẵn ở tên đợt (h.name) phía trên, NV
          không cần gõ lại (theo phản hồi user). */}
      {picked.length > 0 && !confirmUnder && (
        <button onClick={send} disabled={sending} className="w-full mt-2.5 bg-indigo-600 text-white rounded-lg py-2 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {sending ? "Đang gửi..." : `Gửi đơn xin nghỉ ${picked.length} ngày`}
        </button>
      )}
      {/* Chọn ít hơn tối đa được phép → hỏi lại 1 bước trước khi gửi thật, nhắc rõ phần dư dùng
          được lần khác (theo phản hồi user), thay vì gửi luôn khiến NV tưởng nhầm mất phần dư. */}
      {confirmUnder && (
        <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          <p className="text-xs text-amber-800 leading-snug">
            Đợt này bạn được nghỉ tối đa <b>{limit}</b> ngày — đang chọn <b>{picked.length}</b> ngày, còn <b>{availableSlots - picked.length}</b> ngày bạn có thể dùng vào đợt/lần khác. Xác nhận gửi đơn?
          </p>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setConfirmUnder(false)} className="flex-1 border border-amber-300 bg-white rounded-lg py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">Chọn thêm</button>
            <button type="button" onClick={doSend} disabled={sending} className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {sending ? "Đang gửi..." : "Xác nhận gửi"}
            </button>
          </div>
        </div>
      )}
      {err && <p className="text-[11px] text-red-500 mt-1.5">{err}</p>}
      </div>
    </div>
  );
}

// ─────────── TAB NGHỈ PHÉP ───────────
function LeaveTab({ onNew }: { onNew: () => void }) {
  const [d, setD] = useState<{ leaveBalance: number; requests: { id: string; typeLabel: string; fromDate: string; toDate: string; days: number; reason: string | null; status: string; note: string | null; companyName: string; holidayName?: string | null; holidayDescription?: string | null }[] } | null>(null);
  const [hd, setHd] = useState<{ holidays: WHoliday[] } | null>(null);
  const loadLeave = () => fetch("/api/worker/leave").then((r) => r.ok ? r.json() : null).then(setD).catch(() => {});
  const loadHolidays = () => fetch("/api/worker/holidays").then((r) => r.ok ? r.json() : null).then(setHd).catch(() => {});
  useEffect(() => { loadLeave(); loadHolidays(); }, []);
  if (!d) return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>;
  const badge = (s: string) => s === "approved" ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Đã duyệt</span>
    : s === "rejected" ? <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} /> Từ chối</span>
    : <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={11} /> Chờ duyệt</span>;
  const fixedHolidays = hd?.holidays.filter((h) => h.mode === "fixed") ?? [];
  const flexibleHolidays = hd?.holidays.filter((h) => h.mode === "flexible" && h.employeeId) ?? [];
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center"><Umbrella size={24} /></div>
        <div><p className="text-3xl font-extrabold">{d.leaveBalance}<span className="text-base font-semibold text-blue-200"> ngày</span></p><p className="text-sm text-blue-100">Phép năm còn lại</p></div>
      </div>
      <button onClick={onNew} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700"><Plus size={16} /> Tạo đơn nghỉ phép</button>

      {fixedHolidays.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 px-1 flex items-center gap-1.5"><CalendarDays size={13} className="text-blue-500" /> Ngày lễ công ty — tự động, không cần xin</p>
          {fixedHolidays.map((h) => (
            <div key={h.id} className="flex items-stretch bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 flex-1 min-w-0 px-3.5 py-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Gift size={16} className="text-blue-500" strokeWidth={1.5} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                  <p className="text-[11px] text-gray-400">{new Date(h.startDate).toLocaleDateString("vi-VN")}{h.endDate !== h.startDate ? ` → ${new Date(h.endDate).toLocaleDateString("vi-VN")}` : ""}</p>
                  {h.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{h.description}</p>}
                </div>
              </div>
              <div className="flex items-center px-3 border-l border-dashed border-blue-200 bg-blue-50/60 shrink-0">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide text-center leading-tight">Tự động<br />nghỉ lễ</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {flexibleHolidays.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-gray-700 px-1">Đợt nghỉ lễ đang mở — tự chọn ngày</p>
          {flexibleHolidays.map((h) => <HolidayPicker key={h.id} h={h} onSent={() => { loadLeave(); loadHolidays(); }} />)}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">Đơn nghỉ phép</p>
        {d.requests.length === 0 ? <p className="text-sm text-gray-400">Chưa có đơn nào. Bấm <b>“Tạo đơn nghỉ phép”</b> ở trên để xin nghỉ ngay trong app — công ty sẽ nhận và duyệt.</p> : (
          <div className="space-y-2.5">
            {d.requests.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-800">{r.typeLabel}{r.holidayName ? ` · ${r.holidayName}` : ""} · {r.days} ngày</p>{badge(r.status)}</div>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(r.fromDate).toLocaleDateString("vi-VN")} → {new Date(r.toDate).toLocaleDateString("vi-VN")}</p>
                {/* Nghỉ lễ tự chọn không thu "Lý do" từ NV — hiện mô tả chi tiết đợt lễ (sếp khai)
                    thay thế, để đơn không trông trống trơn (theo phản hồi user). */}
                {r.reason ? (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.reason}</p>
                ) : r.holidayDescription ? (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{r.holidayDescription}</p>
                ) : null}
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
  { k: "late_arrival", label: "Xin đến muộn", Icon: LogIn },
  { k: "correction", label: "Sửa chấm công", Icon: Clock },
  { k: "overtime", label: "Xin tăng ca", Icon: CalendarClock },
];
// min-w-0: input/select type="date"/"time" trên iOS Safari tự có độ rộng tối thiểu riêng
// (min-width:auto ở chính input, không chỉ ở ô grid cha) mà "width:100%" không ép co lại
// được — khiến nó tràn ra ngoài ô của mình trong grid-cols-2/3 ("Tạo đơn mới" ở trên), làm
// 2-3 ô đè chồng lên nhau trên màn hình hẹp. Phải đặt min-w-0 ở CẢ input lẫn ô grid cha (Lbl
// bên dưới) thì mới co đúng — chỉ sửa 1 trong 2 chỗ không đủ.
const INP = "w-full min-w-0 mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white";
function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return <label className="block mb-2.5 min-w-0"><span className="text-xs text-gray-500">{t}</span>{children}</label>;
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
          <p className="text-gray-400 text-xs mt-1">Tạo đơn xin nghỉ, về sớm, đến muộn, sửa chấm công hoặc tăng ca — công ty sẽ nhận và duyệt, bạn theo dõi ngay tại đây.</p>
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
            {kind === "late_arrival" && (<>
              <div className="grid grid-cols-2 gap-2"><Lbl t="Ngày"><input type="date" value={F("date")} onChange={(e) => setField("date", e.target.value)} className={INP} /></Lbl><Lbl t="Đến lúc"><input type="time" value={F("leaveTime")} onChange={(e) => setField("leaveTime", e.target.value)} className={INP} /></Lbl></div>
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

function TabLoading() { return <div className="text-center text-gray-400 py-10"><Loader2 size={18} className="animate-spin inline" /></div>; }
function TabEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">{icon}<p className="text-gray-500 text-sm mt-2">{text}</p></div>;
}
const dmy = (s: string) => { try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; } };

// ─────────── TAB LỊCH CA — lịch cả tháng, ngày nào đi làm/ngày nào nghỉ ───────────
type MonthDay = { date: string; isWorkDay: boolean; offLabel: string | null; source: string; sessions: { label: string | null; checkIn: string; checkOut: string }[] };
type MonthShiftData = { companies: { companyId: string; companyName: string }[]; companyId: string; year: number; month: number; days: MonthDay[] };
const CAL_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
// Chỉ hiện thêm ở khung chi tiết bên dưới lịch (không cần trên lưới) — cho NV biết VÌ SAO hôm đó
// tính là ngày làm, khớp `source` trả về từ buildMonthSchedule() (lib/monthSchedule.ts).
const SHIFT_SOURCE_LABELS: Record<string, string> = {
  day_override: "Ngày làm khác", roster: "Theo lịch phân ca (sếp xếp)", weekly_shift: "Theo lịch làm việc hàng tuần",
};

function ShiftsTab() {
  const nowVN = new Date(Date.now() + 7 * 3600e3);
  const todayStr = nowVN.toISOString().slice(0, 10);
  const [year, setYear] = useState(nowVN.getUTCFullYear());
  const [month, setMonth] = useState(nowVN.getUTCMonth() + 1);
  const [companyId, setCompanyId] = useState("");
  const [selected, setSelected] = useState(todayStr);
  const [d, setD] = useState<MonthShiftData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/worker/shifts?year=${year}&month=${month}${companyId ? `&companyId=${companyId}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MonthShiftData | null) => { setD(j); if (j && !companyId && j.companyId) setCompanyId(j.companyId); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month, companyId]);

  const goMonth = (delta: 1 | -1) => {
    const nm = month + delta;
    const ny = nm < 1 ? year - 1 : nm > 12 ? year + 1 : year;
    const nmWrapped = nm < 1 ? 12 : nm > 12 ? 1 : nm;
    setYear(ny); setMonth(nmWrapped);
    setSelected(`${ny}-${String(nmWrapped).padStart(2, "0")}-01`);
  };

  if (loading && !d) return <TabLoading />;
  if (!d || d.companies.length === 0) return <TabEmpty icon={<CalendarDays size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Bạn chưa được xếp vào công ty nào." />;

  const byDate = new Map(d.days.map((x) => [x.date, x]));
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=CN
  const startOffset = (firstDow + 6) % 7; // đổi mốc về T2=0
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInMonth; i++) cells[startOffset + i] = i + 1;

  const dotColor = (info: MonthDay) =>
    info.isWorkDay ? "bg-blue-500" : info.source === "leave" ? "bg-amber-400" : info.source === "holiday" ? "bg-indigo-400" : "bg-gray-300";

  const selectedDay = byDate.get(selected);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} className="text-gray-600" /></button>
        <p className="text-sm font-semibold text-gray-800">Tháng {month}/{year}</p>
        <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} className="text-gray-600" /></button>
      </div>

      {d.companies.length > 1 && (
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          {d.companies.map((c) => <option key={c.companyId} value={c.companyId}>{c.companyName}</option>)}
        </select>
      )}

      <div className="flex items-center gap-3 flex-wrap px-1">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-[11px] text-gray-500">Đi làm</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-300" /><span className="text-[11px] text-gray-500">Nghỉ tuần</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[11px] text-gray-500">Nghỉ phép</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-indigo-400" /><span className="text-[11px] text-gray-500">Nghỉ lễ</span></div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {CAL_DAYS.map((x) => <div key={x} className="py-2 text-center text-[10px] font-semibold text-gray-500">{x}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e${idx}`} className="min-h-[50px] border-b border-r border-gray-50 bg-gray-50/50" />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const info = byDate.get(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selected;
            return (
              <button
                key={dateStr}
                onClick={() => setSelected(dateStr)}
                className={`min-h-[50px] p-1 border-b border-r border-gray-50 flex flex-col items-center justify-center gap-1 ${isSelected ? "bg-blue-50" : ""}`}
              >
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-blue-600 text-white" : "text-gray-700"}`}>{day}</span>
                {info && <span className={`w-1.5 h-1.5 rounded-full ${dotColor(info)}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800">
            {new Date(selected).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}
            {selected === todayStr && <span className="text-[11px] text-blue-600 font-normal"> · Hôm nay</span>}
          </p>
          {selectedDay.isWorkDay ? (
            <div className="mt-2 space-y-1.5">
              {selectedDay.sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock size={13} className="text-blue-500 shrink-0" />
                  <span>{s.label ? `${s.label}: ` : ""}{s.checkIn} – {s.checkOut}</span>
                </div>
              ))}
              {SHIFT_SOURCE_LABELS[selectedDay.source] && <p className="text-[11px] text-gray-400 mt-1.5">{SHIFT_SOURCE_LABELS[selectedDay.source]}</p>}
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-gray-500">{selectedDay.offLabel}</p>
          )}
        </div>
      )}
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
          <p className="text-[11px] text-gray-400 text-center">Số liệu do công ty chốt. Thấy sai? Tạo đơn ở tab “Đơn xin”.</p>
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
type WorkerAnnLinkPreview = { title: string; description: string; image: string | null; embedUrl: string | null; provider: string; url: string };
type WorkerAnnComment = { id: string; content: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; updatedAt: string | null; actorType: string; isMine: boolean };
type WorkerAnnReactionKey = "like" | "love" | "haha" | "wow" | "sad" | "angry";
type WorkerAnn = {
  id: string; title: string; content: string; type: string; pinned: boolean; publishedAt: string; companyName: string;
  images: string[]; videoUrl: string | null; linkUrl: string | null; linkPreview: WorkerAnnLinkPreview | null; hashtags: string[];
  reactionCounts: Partial<Record<WorkerAnnReactionKey, number>>; myReaction: WorkerAnnReactionKey | null; comments: WorkerAnnComment[];
};
const WORKER_REACTIONS: { key: WorkerAnnReactionKey; emoji: string; label: string }[] = [
  { key: "like", emoji: "👍", label: "Thích" },
  { key: "love", emoji: "❤️", label: "Yêu thích" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Buồn" },
  { key: "angry", emoji: "😡", label: "Phẫn nộ" },
];

function AnnouncementsTab() {
  const [d, setD] = useState<{ items: WorkerAnn[] } | null>(null);
  const load = useCallback(() => {
    fetch("/api/worker/announcements").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <TabLoading />;
  const cls = (t: string) => t === "urgent" ? "border-red-200 bg-red-50" : t === "warning" ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-white";

  async function react(a: WorkerAnn, emoji: WorkerAnnReactionKey) {
    setD((prev) => prev ? {
      items: prev.items.map((x) => {
        if (x.id !== a.id) return x;
        const was = x.myReaction;
        const counts = { ...x.reactionCounts };
        if (was) counts[was] = Math.max(0, (counts[was] || 1) - 1);
        const myReaction = was === emoji ? null : emoji;
        if (myReaction) counts[myReaction] = (counts[myReaction] || 0) + 1;
        return { ...x, myReaction, reactionCounts: counts };
      }),
    } : prev);
    await fetch(`/api/worker/announcements/${a.id}/reactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }),
    });
    load();
  }

  async function comment(a: WorkerAnn, content: string) {
    if (!content.trim()) return;
    await fetch(`/api/worker/announcements/${a.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
    });
    load();
  }

  async function editComment(a: WorkerAnn, commentId: string, content: string) {
    if (!content.trim()) return;
    const r = await fetch(`/api/worker/announcements/${a.id}/comments/${commentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
    });
    if (!r.ok) { const j = await r.json().catch(() => null); alert(j?.error || "Không sửa được bình luận — thử lại."); return; }
    load();
  }

  async function deleteComment(a: WorkerAnn, commentId: string) {
    if (!confirm("Xoá bình luận này?")) return;
    const r = await fetch(`/api/worker/announcements/${a.id}/comments/${commentId}`, { method: "DELETE" });
    if (!r.ok) { const j = await r.json().catch(() => null); alert(j?.error || "Không xoá được bình luận — thử lại."); return; }
    load();
  }

  return d.items.length === 0 ? <TabEmpty icon={<Megaphone size={30} className="text-gray-300 mx-auto" strokeWidth={1.4} />} text="Chưa có tin nội bộ nào." /> : (
    <div className="space-y-2.5">
      {d.items.map((a) => (
        <div key={a.id} className={`border rounded-xl p-4 shadow-sm ${cls(a.type)}`}>
          <div className="flex items-center gap-2">
            {a.pinned && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">GHIM</span>}
            <p className="text-sm font-semibold text-gray-800">{a.title}</p>
          </div>
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>

          {a.images.length > 0 && (
            <div className={`grid gap-1.5 mt-2.5 ${a.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {a.images.map((src, i) => (
                // object-contain + nền xám: hiện trọn ảnh gốc, không cắt mất phần trên/dưới
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className={`w-full ${a.images.length === 1 ? "max-h-[480px]" : "max-h-60"} object-contain rounded-lg border border-gray-100 bg-gray-50`} />
              ))}
            </div>
          )}
          {a.videoUrl && <video src={a.videoUrl} controls className="w-full max-h-72 rounded-lg border border-gray-100 mt-2.5 bg-black" />}
          {a.linkPreview && <WorkerLinkCard preview={a.linkPreview} />}

          <p className="text-[11px] text-gray-400 mt-2">{dmy(a.publishedAt)} · {a.companyName}</p>

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-black/5">
            <div className="flex items-center gap-0.5">
              {WORKER_REACTIONS.map((r) => (
                <button key={r.key} onClick={() => react(a, r.key)} title={r.label}
                  className={`text-base px-1.5 py-1 rounded-lg transition-transform hover:scale-125 ${a.myReaction === r.key ? "bg-blue-50 ring-1 ring-blue-200" : ""}`}>
                  {r.emoji}
                </button>
              ))}
              {Object.values(a.reactionCounts).reduce((s, n) => s + (n || 0), 0) > 0 && (
                <span className="text-xs text-gray-400 ml-1">{Object.values(a.reactionCounts).reduce((s, n) => s + (n || 0), 0)}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400"><MessageCircle size={13} /> {a.comments.length}</div>
          </div>

          <WorkerCommentBox comments={a.comments} onComment={(c) => comment(a, c)} onEdit={(id, c) => editComment(a, id, c)} onDelete={(id) => deleteComment(a, id)} />
        </div>
      ))}
    </div>
  );
}

function WorkerLinkCard({ preview }: { preview: WorkerAnnLinkPreview }) {
  if (preview.embedUrl && preview.provider === "youtube") {
    return (
      <div className="mt-2.5 rounded-lg overflow-hidden border border-gray-100">
        <div className="aspect-video">
          <iframe src={preview.embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      </div>
    );
  }
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="mt-2.5 flex gap-2.5 border border-gray-100 rounded-lg overflow-hidden bg-white">
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt="" className="w-20 h-20 object-cover shrink-0" />
      )}
      <div className="py-2 pr-2.5 min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 uppercase">{preview.provider}</p>
        <p className="text-xs font-medium text-gray-800 line-clamp-2">{preview.title}</p>
      </div>
    </a>
  );
}

function WorkerCommentBox({ comments, onComment, onEdit, onDelete }: { comments: WorkerAnnComment[]; onComment: (content: string) => void; onEdit: (commentId: string, content: string) => void; onDelete: (commentId: string) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const visible = open ? comments : comments.slice(-2);

  const startEdit = (c: WorkerAnnComment) => { setEditingId(c.id); setEditText(c.content); };
  const saveEdit = () => { if (editingId && editText.trim()) onEdit(editingId, editText); setEditingId(null); };

  return (
    <div className="mt-2">
      {comments.length > 2 && !open && (
        <button onClick={() => setOpen(true)} className="text-xs text-gray-400 mb-1.5">Xem tất cả {comments.length} bình luận</button>
      )}
      <div className="space-y-1.5">
        {visible.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-sm group">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0">
              {c.authorName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {editingId === c.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 text-sm border border-blue-300 rounded-full px-3 py-1.5 focus:ring-2 focus:ring-blue-300 outline-none bg-white"
                  />
                  <button onClick={saveEdit} disabled={!editText.trim()} className="text-blue-500 disabled:text-gray-300 p-1"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 p-1"><X size={16} /></button>
                </div>
              ) : (
                <>
                  <div className="bg-white/70 rounded-2xl px-3 py-1.5 min-w-0 inline-block max-w-full">
                    <span className="font-medium text-gray-700 text-xs">{c.authorName}</span>
                    <p className="text-gray-600 break-words">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 pl-3 text-[11px] text-gray-400">
                    {c.updatedAt && <span>Đã chỉnh sửa</span>}
                    {c.isMine && (
                      <>
                        <button onClick={() => startEdit(c)} className="hover:text-blue-500 hover:underline">Sửa</button>
                        <button onClick={() => onDelete(c.id)} className="hover:text-red-500 hover:underline">Xoá</button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onComment(text); setText(""); } }} className="flex items-center gap-2 mt-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Viết bình luận..." className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:ring-2 focus:ring-blue-300 outline-none bg-white" />
        <button type="submit" disabled={!text.trim()} className="text-blue-500 disabled:text-gray-300 p-1.5"><Send size={16} /></button>
      </form>
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
