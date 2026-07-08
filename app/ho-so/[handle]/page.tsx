"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck, Star, MapPin, Briefcase, CalendarClock, Phone, Mail, MessageCircle, Facebook, Globe,
  Loader2, Clock, Building2, CheckCircle2, ShieldCheck, Share2, Wallet, Umbrella, IdCard, LogOut,
  XCircle, Camera, Pencil, Plus, X,
} from "lucide-react";
import AdvanceCard from "@/components/worker/AdvanceCard";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

type Social = { phone: string | null; email: string | null; zalo: string | null; website: string | null; facebook: string | null };
type Profile = {
  handle: string | null; isOwner: boolean;
  name: string; avatarUrl: string | null; coverUrl: string | null; bio: string | null;
  role: string; department: string | null; companyName: string | null; location: string; tags: string[];
  socials: Social;
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

type TabKey = "profile" | "income" | "attendance" | "leave";

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

  const firstInitial = data.name.trim().split(/\s+/).pop()?.[0] ?? "?";
  const TABS: { key: TabKey; label: string; Icon: typeof IdCard }[] = [
    { key: "profile", label: "Hồ sơ", Icon: IdCard },
    { key: "income", label: "Thu nhập", Icon: Wallet },
    { key: "attendance", label: "Chấm công", Icon: Clock },
    { key: "leave", label: "Nghỉ phép", Icon: Umbrella },
  ];
  const tabs = data.isOwner ? TABS : TABS.slice(0, 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* ── Sidebar trái (desktop, chính chủ) ── */}
      {data.isOwner && (
        <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-100 fixed inset-y-0 left-0 z-20">
          <div className="flex items-center gap-2.5 px-4 h-16 border-b border-gray-50">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{firstInitial}</div>
            <div className="min-w-0"><p className="font-semibold text-gray-800 text-sm truncate">{data.name}</p><p className="text-[11px] text-gray-400 truncate">{data.role}</p></div>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}>
                  <t.Icon size={17} strokeWidth={active ? 2.4 : 2} /> {t.label}
                </button>
              );
            })}
          </nav>
          <div className="p-2 border-t border-gray-50">
            <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50"><LogOut size={17} /> Đăng xuất</button>
          </div>
        </aside>
      )}

      <div className={data.isOwner ? "md:pl-60" : ""}>
        {/* Top bar */}
        <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
          <div className={`max-w-3xl px-4 h-14 flex items-center justify-between ${data.isOwner ? "mx-auto md:mx-0 md:pl-8" : "mx-auto"}`}>
            <div className="flex items-center gap-2 min-w-0 md:hidden">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{firstInitial}</div>
              <span className="font-semibold text-gray-800 text-sm truncate">{data.name}</span>
            </div>
            <span className="hidden md:block font-semibold text-gray-700 text-sm">{tabs.find((t) => t.key === tab)?.label}</span>
            <div className="flex items-center gap-2">
              <button onClick={share} className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-full px-3 py-1.5 hover:bg-blue-700 transition-colors"><Share2 size={13} /> {copied ? "Đã chép" : "Chia sẻ"}</button>
              {data.isOwner && <button onClick={logout} title="Đăng xuất" className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100"><LogOut size={17} /></button>}
            </div>
          </div>
          {/* Tab ngang (mobile, chính chủ) */}
          {data.isOwner && (
            <div className="md:hidden max-w-3xl mx-auto px-2 flex gap-1 overflow-x-auto">
              {tabs.map((t) => {
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

        <div className={`max-w-3xl px-4 py-4 ${data.isOwner ? "mx-auto md:mx-0 md:pl-8" : "mx-auto"}`}>
          {tab === "profile" && <ProfileTab data={data} onChange={setData} />}
          {tab === "income" && data.isOwner && <IncomeTab />}
          {tab === "attendance" && data.isOwner && <AttendanceTab />}
          {tab === "leave" && data.isOwner && <LeaveTab />}
        </div>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="relative h-36 sm:h-52 bg-gradient-to-r from-blue-600 to-indigo-600">
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
              <BadgeCheck size={20} className="text-blue-600" />
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
        {d.requests.length === 0 ? <p className="text-sm text-gray-400">Chưa có đơn nào. Xin nghỉ tại kiosk công ty (quét mặt).</p> : (
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 text-center">
      <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mx-auto mb-1.5">{icon}</div>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-blue-100 mt-0.5">{label}</p>
    </div>
  );
}
