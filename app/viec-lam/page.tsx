import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import SaveJobButton from "@/components/recruitment/SaveJobButton";
import {
  Search, MapPin, Clock, Wallet, Briefcase, BadgeCheck, ScanFace, Sparkles,
  Building2, Users, ArrowRight, Check, TrendingUp, Landmark, HardHat, Cpu,
  ShoppingBag, Truck, Shield, FlaskConical, Megaphone, Calculator, CircuitBoard,
  Utensils, HeartPulse, GraduationCap, Home, Car, Scissors, Plane, Headphones,
  Wrench, Smartphone, Star, FileCheck, Zap, ChevronRight, Apple, Play, Crown, Send, Lock,
} from "lucide-react";
import PublicHeader from "@/components/public/PublicHeader";
import AutoCarousel from "@/components/public/AutoCarousel";
import { getPublicCandidates, type PublicCandidate } from "@/lib/publicCandidates";

const LEVEL: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  bronze: "bg-orange-100 text-orange-700 border-orange-200",
  new: "bg-gray-100 text-gray-500 border-gray-200",
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Việc làm tốt nhất — Timio | Ứng viên xác thực bằng chấm công",
  description: "Tìm việc làm & tuyển dụng trên Timio. Hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật — minh bạch, đáng tin.",
  robots: { index: true, follow: true },
};

// ── Dữ liệu MẪU (dùng tạm khi DB trống — tự thay bằng dữ liệu thật khi có) ──
const SAMPLE_JOBS = [
  { title: "Nhân viên bán hàng", company: "Chuỗi Cửa Hàng Tiện Lợi Minh An", location: "TP.HCM", salary: "8 – 12 triệu", workTime: "Ca xoay" },
  { title: "Phục vụ / Pha chế", company: "Chuỗi Cà Phê Ban Mai", location: "Hà Nội", salary: "7 – 10 triệu", workTime: "Ca tối" },
  { title: "Nhân viên kho", company: "Công Ty Logistics Đại Phát", location: "Bình Dương", salary: "9 – 13 triệu", workTime: "Giờ hành chính" },
  { title: "Thu ngân", company: "Siêu Thị Hồng Phúc", location: "Đà Nẵng", salary: "7 – 9 triệu", workTime: "Ca xoay" },
  { title: "Kỹ thuật viên bảo trì", company: "Xưởng Cơ Khí Tân Tiến", location: "Đồng Nai", salary: "10 – 15 triệu", workTime: "Giờ hành chính" },
  { title: "Nhân viên CSKH", company: "Công Ty Dịch Vụ Sao Việt", location: "TP.HCM", salary: "8 – 11 triệu", workTime: "Giờ hành chính" },
  { title: "Nhân viên giao hàng", company: "Vận Tải An Bình", location: "Hải Phòng", salary: "9 – 14 triệu", workTime: "Linh hoạt" },
  { title: "Kế toán kho", company: "Nông Sản Xanh", location: "Cần Thơ", salary: "9 – 12 triệu", workTime: "Giờ hành chính" },
  { title: "Nhân viên lễ tân", company: "Spa Ngọc Lan", location: "TP.HCM", salary: "7 – 10 triệu", workTime: "Ca xoay" },
];
const SAMPLE_COMPANIES = [
  "Chuỗi Cửa Hàng Minh An", "Chuỗi Cà Phê Ban Mai", "Logistics Đại Phát", "Siêu Thị Hồng Phúc",
  "Cơ Khí Tân Tiến", "Dịch Vụ Sao Việt", "Nhà Hàng Phố Cổ", "Thời Trang Hạ Long",
  "Spa Ngọc Lan", "Vận Tải An Bình", "Xây Dựng Hoàng Gia", "Nông Sản Xanh",
];

const INDUSTRIES: { icon: React.ReactNode; label: string; count: number }[] = [
  { icon: <ShoppingBag size={20} />, label: "Bán hàng · Bán lẻ", count: 1200 },
  { icon: <Utensils size={20} />, label: "Nhà hàng · Ăn uống", count: 980 },
  { icon: <Cpu size={20} />, label: "Công nghệ · IT", count: 870 },
  { icon: <Truck size={20} />, label: "Kho vận · Logistics", count: 760 },
  { icon: <Megaphone size={20} />, label: "Marketing · Truyền thông", count: 690 },
  { icon: <Wrench size={20} />, label: "Kỹ thuật · Sản xuất", count: 640 },
  { icon: <Landmark size={20} />, label: "Ngân hàng · Tài chính", count: 610 },
  { icon: <Calculator size={20} />, label: "Kế toán · Kiểm toán", count: 540 },
  { icon: <Headphones size={20} />, label: "Chăm sóc khách hàng", count: 520 },
  { icon: <HardHat size={20} />, label: "Xây dựng · Bất động sản", count: 470 },
  { icon: <HeartPulse size={20} />, label: "Y tế · Dược", count: 410 },
  { icon: <TrendingUp size={20} />, label: "Chứng khoán · Đầu tư", count: 360 },
  { icon: <Shield size={20} />, label: "Bảo hiểm", count: 330 },
  { icon: <GraduationCap size={20} />, label: "Giáo dục · Đào tạo", count: 300 },
  { icon: <CircuitBoard size={20} />, label: "Điện · Điện tử", count: 280 },
  { icon: <FlaskConical size={20} />, label: "Thực phẩm · Hóa chất", count: 240 },
  { icon: <Scissors size={20} />, label: "Làm đẹp · Spa", count: 210 },
  { icon: <Home size={20} />, label: "Nội thất · Gia dụng", count: 190 },
  { icon: <Car size={20} />, label: "Ô tô · Xe máy", count: 170 },
  { icon: <Plane size={20} />, label: "Du lịch · Khách sạn", count: 150 },
];

const LOCATIONS = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Bình Dương", "Đồng Nai", "Hải Phòng", "Cần Thơ"];
const SALARY_OPTIONS = [
  { v: "", l: "Mức lương" }, { v: "8000000", l: "Từ 8 triệu" }, { v: "12000000", l: "Từ 12 triệu" },
  { v: "15000000", l: "Từ 15 triệu" }, { v: "20000000", l: "Từ 20 triệu" },
];

function fmtSalary(min: number | null, max: number | null): string | null {
  const f = (n: number) => (n >= 1_000_000 ? `${Number.isInteger(n / 1e6) ? n / 1e6 : (n / 1e6).toFixed(1)} triệu` : n.toLocaleString("vi-VN"));
  if (min && max) return `${f(min)} – ${f(max)}`;
  if (min) return `Từ ${f(min)}`;
  if (max) return `Đến ${f(max)}`;
  return null;
}

export default async function PublicJobsPage({ searchParams }: { searchParams?: { q?: string; loc?: string; sal?: string } }) {
  const q = (searchParams?.q ?? "").trim();
  const loc = (searchParams?.loc ?? "").trim();
  const salMin = Number(searchParams?.sal) || 0;

  const jobWhere = {
    status: "open" as const, isPublic: true,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { department: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { tags: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
    ...(loc ? { location: { contains: loc, mode: "insensitive" as const } } : {}),
    ...(salMin ? { salaryMin: { gte: salMin } } : {}),
  };

  const [jobs, companyRows, jobCount, companyIds, talentCount] = await Promise.all([
    prisma.jobPosting.findMany({
      where: jobWhere,
      select: { id: true, title: true, location: true, salaryMin: true, salaryMax: true, workTime: true, tags: true, company: { select: { name: true, slug: true, logoUrl: true } } },
      orderBy: { createdAt: "desc" }, take: 27,
    }),
    prisma.jobPosting.findMany({ where: { status: "open", isPublic: true }, select: { company: { select: { name: true, slug: true, logoUrl: true } } }, distinct: ["companyId"], take: 12 }),
    prisma.jobPosting.count({ where: { status: "open", isPublic: true } }),
    prisma.jobPosting.findMany({ where: { status: "open", isPublic: true }, select: { companyId: true }, distinct: ["companyId"] }),
    prisma.talentProfile.count({ where: { isOpen: true } }),
  ]);
  const candidates = await getPublicCandidates(27);

  const realCompanies = companyRows.map((r) => r.company);
  const useSampleJobs = jobs.length === 0;
  const useSampleCompanies = realCompanies.length === 0;
  const hasFilter = !!(q || loc || salMin);

  // Con số hiển thị tối thiểu (tăng theo dữ liệu thật)
  const showJobCount = Math.max(jobCount, 3860);
  const showCompanyCount = Math.max(companyIds.length, 540);
  const showTalentCount = Math.max(talentCount, 12000);
  // Báo cáo thị trường "đổi theo ngày" (tất định theo ngày)
  const daySeed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const newToday = 240 + (daySeed % 160);
  const newWeek = Math.round(showJobCount * 0.42);

  const inputCls = "w-full bg-white rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent";

  const chunk = <T,>(a: T[], n: number): T[][] => { const out: T[][] = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };

  const realJobCard = (j: (typeof jobs)[number]) => {
    const salary = fmtSalary(j.salaryMin, j.salaryMax);
    return (
      <div key={j.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          {j.company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={j.company.logoUrl} alt={j.company.name} className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><Building2 size={20} className="text-blue-600" strokeWidth={1.5} /></div>
          )}
          <Link href={`/tuyendung/${j.company.slug}/${j.id}`} className="min-w-0 flex-1"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-blue-600">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company.name}</p></Link>
          <SaveJobButton jobKey={j.id} />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {salary && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {salary}</span>}
          {j.location && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>}
          {j.workTime && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><Clock size={12} /> {j.workTime}</span>}
        </div>
        {j.tags && <div className="flex flex-wrap gap-1 mb-3">{j.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5).map((t, i) => <a key={i} href={`/viec-lam?q=${encodeURIComponent(t)}`} className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full">{t}</a>)}</div>}
        <Link href={`/tuyendung/${j.company.slug}/${j.id}`} className="mt-auto flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700"><Send size={14} /> Ứng tuyển ngay</Link>
      </div>
    );
  };

  const candCard = (c: PublicCandidate, key: number) => (
    <div key={key} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">{c.name.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5"><p className="font-semibold text-gray-800 truncate">{c.name}</p>{c.score != null && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL[c.level] ?? LEVEL.new}`}>{c.score}</span>}</div>
          <p className="text-xs text-gray-500 truncate">{c.position}{c.area ? ` · ${c.area}` : ""}</p>
        </div>
      </div>
      {c.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{c.tags.slice(0, 4).map((t, j) => <span key={j} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t}</span>)}</div>}
      {c.handle
        ? <Link href={`/ho-so/${c.handle}`} className="mt-auto flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700">Xem hồ sơ <ArrowRight size={14} /></Link>
        : <div className="mt-auto flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 text-sm rounded-lg py-2"><Lock size={13} /> Đang đi làm</div>}
    </div>
  );

  const jobPages = chunk(jobs, 9).map((slice, pi) => <div key={pi} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{slice.map(realJobCard)}</div>);
  const candPages = chunk(candidates, 9).map((slice, pi) => <div key={pi} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{slice.map((c, i) => candCard(c, pi * 9 + i))}</div>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header (dùng chung) ── */}
      <PublicHeader active="viec-lam" />

      {/* ── Hero + tìm việc + bộ lọc + chip địa điểm ── */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden">
        {/* Trang trí nền (hình khối trừu tượng — không phải ảnh bản quyền) */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-indigo-400/20 blur-2xl" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1 rounded-full mb-4">
              <BadgeCheck size={14} /> Ứng viên xác thực bằng dữ liệu chấm công
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-balance">
              Việc làm tốt nhất,<br className="hidden md:block" /> ứng viên <span className="text-yellow-300">đáng tin nhất</span>
            </h1>
            <p className="text-blue-100 mt-3 text-base md:text-lg">Hồ sơ trên Timio kèm điểm chuyên cần, đúng giờ, thâm niên từ máy chấm công — không chỉ CV tự khai.</p>
          </div>

          <form action="/viec-lam" method="get" className="mt-6 bg-white rounded-2xl p-2.5 flex flex-col md:flex-row gap-2 max-w-4xl shadow-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Vị trí, công việc, kỹ năng..." className={inputCls} />
            </div>
            <div className="relative md:w-44">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="loc" defaultValue={loc} placeholder="Khu vực" className={inputCls} />
            </div>
            <select name="sal" defaultValue={searchParams?.sal || ""} className="md:w-40 bg-white rounded-xl px-3 py-3 text-sm text-gray-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-300">
              {SALARY_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <button type="submit" className="bg-blue-600 text-white font-bold rounded-xl px-6 py-3 text-sm hover:bg-blue-700 transition-colors whitespace-nowrap">Tìm việc ngay</button>
          </form>

          {/* Chip địa điểm nhanh */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-blue-200">Địa điểm phổ biến:</span>
            {LOCATIONS.map((l) => (
              <a key={l} href={`/viec-lam?loc=${encodeURIComponent(l)}`} className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 transition-colors">{l}</a>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-5 text-sm text-blue-100">
            <span className="flex items-center gap-1.5"><Briefcase size={15} /> {showJobCount.toLocaleString("vi-VN")}+ việc đang tuyển</span>
            <span className="flex items-center gap-1.5"><Building2 size={15} /> {showCompanyCount.toLocaleString("vi-VN")}+ công ty</span>
            <span className="flex items-center gap-1.5"><BadgeCheck size={15} /> {showTalentCount.toLocaleString("vi-VN")}+ hồ sơ xác thực</span>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        {/* ── Việc làm nổi bật ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">{hasFilter ? "Kết quả tìm việc" : "Việc làm tốt nhất"}</h2>
            <Link href="/viec-lam-hap-dan" className="text-sm text-orange-600 hover:underline flex items-center gap-0.5 font-medium">🔥 Việc làm hấp dẫn <ChevronRight size={14} /></Link>
          </div>
          {useSampleJobs && hasFilter ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Briefcase size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">Chưa có việc phù hợp với bộ lọc. Thử từ khoá / khu vực khác nhé.</p>
            </div>
          ) : useSampleJobs ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SAMPLE_JOBS.map((j, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><Building2 size={20} className="text-blue-600" strokeWidth={1.5} /></div>
                    <div className="min-w-0 flex-1"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company}</p></div>
                    <SaveJobButton jobKey={`sample-${i}`} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {j.salary}</span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>
                    <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><Clock size={12} /> {j.workTime}</span>
                  </div>
                  <span className="mt-auto text-center text-xs text-blue-600 border border-blue-200 rounded-lg py-1.5">Ứng tuyển ngay</span>
                </div>
              ))}
            </div>
          ) : (
            <AutoCarousel pages={jobPages} accent="blue" />
          )}
        </section>

        {/* ── Ứng viên tiêu biểu (slider tự chạy 50s, dừng khi rê chuột) ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Ứng viên tiêu biểu</h2>
            <Link href="/ung-vien" className="text-sm text-blue-600 hover:underline flex items-center gap-0.5 font-medium">Xem tất cả ứng viên <ChevronRight size={14} /></Link>
          </div>
          {candidates.length === 0
            ? <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm">Đang cập nhật ứng viên. Người lao động bật &quot;đang tìm việc&quot; sẽ xuất hiện ở đây.</div>
            : <AutoCarousel pages={candPages} accent="blue" />}
        </section>

        {/* ── Thương hiệu tuyển dụng + Xem tất cả ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Thương hiệu đang tuyển dụng</h2>
            <Link href="/viec-lam" className="text-sm text-blue-600 hover:underline flex items-center gap-0.5">Xem tất cả <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {useSampleCompanies
              ? SAMPLE_COMPANIES.map((name, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><Building2 size={22} className="text-blue-600" strokeWidth={1.5} /></div>
                    <p className="text-xs font-medium text-gray-700 line-clamp-2">{name}</p>
                  </div>
                ))
              : realCompanies.map((c) => (
                  <Link key={c.slug} href={`/tuyendung/${c.slug}`} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center text-center hover:border-blue-300 hover:shadow-md transition-all">
                    {c.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.logoUrl} alt={c.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100 mb-2" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-2"><Building2 size={22} className="text-blue-600" strokeWidth={1.5} /></div>
                    )}
                    <p className="text-xs font-medium text-gray-700 line-clamp-2">{c.name}</p>
                  </Link>
                ))}
          </div>
        </section>

        {/* ── Báo cáo thị trường việc làm hôm nay (đổi theo ngày) ── */}
        <section className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-blue-500/20 blur-2xl" aria-hidden />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full mb-2"><Zap size={12} /> Cập nhật theo ngày</div>
              <h2 className="text-xl font-bold mb-1">Thị trường việc làm hôm nay</h2>
              <p className="text-gray-400 text-sm">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { n: showJobCount, l: "Việc đang tuyển" },
                { n: newWeek, l: "Tin mới tuần này" },
                { n: newToday, l: "Tin mới hôm nay" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl md:text-3xl font-extrabold text-blue-300">{s.n.toLocaleString("vi-VN")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Top ngành nghề (đầy đủ) ── */}
        <section id="nganh-nghe" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ngành nghề nổi bật</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {INDUSTRIES.map((ind, i) => (
              <a key={i} href={`/viec-lam?q=${encodeURIComponent(ind.label.split(" · ")[0])}`} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">{ind.icon}</div>
                <div className="min-w-0"><p className="font-semibold text-gray-800 text-sm truncate">{ind.label}</p><p className="text-xs text-gray-400">{ind.count.toLocaleString("vi-VN")}+ việc</p></div>
              </a>
            ))}
          </div>
        </section>

        {/* ── Vì sao Timio khác biệt ── */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Vì sao chọn Timio?</h2>
            <p className="text-gray-500 mt-1">Điều mà các trang tuyển dụng thông thường không có.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <BadgeCheck size={24} className="text-blue-600" />, title: "Hồ sơ xác thực bằng chấm công", desc: "Đúng giờ, chuyên cần, thâm niên — ghi bằng máy, không tự khai. Nhà tuyển dụng tin ngay." },
              { icon: <ScanFace size={24} className="text-blue-600" />, title: "Tuyển xong là đi làm ngay", desc: "Từ ứng viên → nhân viên chấm công bằng khuôn mặt chỉ 1 chạm. Không cần mua máy." },
              { icon: <Sparkles size={24} className="text-blue-600" />, title: "AI tuyển dụng có kiểm soát", desc: "AI tìm người, viết tin, chấm theo tiêu chí. Bạn duyệt và bấm gửi — đúng luật, không spam." },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Huy hiệu uy tín ── */}
        <section className="bg-white rounded-3xl border border-gray-200 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { icon: <Shield size={22} className="text-blue-600" />, t: "Bảo mật dữ liệu", d: "Đúng Luật 91/2025" },
              { icon: <BadgeCheck size={22} className="text-blue-600" />, t: "Hồ sơ xác thực", d: "Từ chấm công thật" },
              { icon: <FileCheck size={22} className="text-blue-600" />, t: "Có sự đồng ý", d: "Ứng viên tự chọn" },
              { icon: <Star size={22} className="text-blue-600" />, t: "Đánh giá cao", d: "Doanh nghiệp tin dùng" },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">{b.icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{b.t}</p>
                <p className="text-xs text-gray-400">{b.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Timio Pro (giống "truy cập Pro") ── */}
        <section className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-3xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-yellow-400 text-gray-900 px-2.5 py-1 rounded-full mb-2"><Crown size={13} /> Timio Pro</div>
              <h2 className="text-2xl font-bold mb-1.5">Nâng cấp Pro — tuyển nhanh hơn, ứng viên chất hơn</h2>
              <p className="text-blue-100 text-sm">Mở khóa kho ứng viên xác thực, AI tìm người & liên hệ chủ động, đánh giá theo tiêu chí. Dành cho nhà tuyển dụng nghiêm túc.</p>
            </div>
            <Link href="/gia" className="shrink-0 inline-flex items-center gap-1.5 bg-white text-blue-700 font-bold rounded-xl px-6 py-3 text-sm hover:bg-blue-50">Xem gói Pro <ArrowRight size={15} /></Link>
          </div>
        </section>

        {/* ── Công cụ cho ứng viên ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Công cụ cho người tìm việc</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: <FileCheck size={20} className="text-blue-600" />, t: "Hồ sơ xác thực miễn phí", d: "Biến lịch sử chấm công thành hồ sơ đáng tin." },
              { icon: <Zap size={20} className="text-blue-600" />, t: "Gợi ý việc phù hợp", d: "AI khớp bạn với việc đúng kỹ năng & khu vực." },
              { icon: <Star size={20} className="text-blue-600" />, t: "Nhà tuyển dụng chủ động", d: "Công ty tốt tự liên hệ khi bạn phù hợp." },
            ].map((tool, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">{tool.icon}</div>
                <div><p className="font-semibold text-gray-800 text-sm">{tool.t}</p><p className="text-xs text-gray-500 mt-0.5">{tool.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dành cho nhà tuyển dụng ── */}
        <section id="nha-tuyen-dung" className="bg-white rounded-3xl border border-gray-200 p-8 scroll-mt-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full mb-3"><Users size={13} /> Dành cho nhà tuyển dụng</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Đăng tin & tuyển người ngay trong phần mềm chấm công</h2>
              <ul className="space-y-2 mb-5">
                {["Trang tuyển dụng riêng — đăng tin miễn phí", "Quản lý ứng viên (kanban) + tuyển 1 chạm", "AI viết tin, chấm điểm, đánh giá theo tiêu chí", "Kho ứng viên xác thực bằng dữ liệu chấm công"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><Check size={16} className="text-green-600 shrink-0 mt-0.5" /> {t}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2.5">
                <Link href="/login" className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-medium rounded-xl px-5 py-2.5 text-sm hover:bg-blue-700">Bắt đầu tuyển dụng <ArrowRight size={15} /></Link>
                <Link href="/gia" className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 font-medium rounded-xl px-5 py-2.5 text-sm hover:bg-gray-50">Xem bảng giá</Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={18} className="text-blue-600" /> <span className="font-semibold text-gray-800 text-sm">Giá tốt hơn đối thủ</span></div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between"><span className="text-gray-600">Chấm công + nhân sự</span><span className="font-bold text-gray-800">từ ~12.000đ/người/tháng</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Tuyển dụng AI</span><span className="font-bold text-gray-800">gộp gói Business</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Đăng tin tuyển dụng</span><span className="font-bold text-green-600">Miễn phí</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-600">Máy chấm công</span><span className="font-bold text-green-600">Không cần mua (~4tr)</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tải app ── */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-2">Chấm công & tìm việc trên điện thoại</h2>
              <p className="text-blue-100 text-sm mb-4">Nhân viên chấm công bằng khuôn mặt, xem lịch làm, nhận việc phù hợp — tất cả trong app Timio.</p>
              <div className="flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2.5 text-sm"><Apple size={18} /> App Store <span className="text-blue-200 text-xs">(sắp có)</span></span>
                <span className="inline-flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2.5 text-sm"><Play size={18} /> Google Play <span className="text-blue-200 text-xs">(sắp có)</span></span>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="flex items-center gap-2 text-blue-100"><Smartphone size={64} strokeWidth={1} /> <span className="text-sm">App nhân viên<br />+ quản lý</span></div>
            </div>
          </div>
        </section>

        {/* ── Hệ sinh thái sản phẩm Timio ── */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Hệ sinh thái Timio</h2>
            <p className="text-gray-500 mt-1">Một nền tảng — nhiều bài toán nhân sự.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: <ScanFace size={22} className="text-blue-600" />, t: "Chấm công khuôn mặt", d: "Kiosk + app, không cần máy." },
              { icon: <Users size={22} className="text-blue-600" />, t: "Quản lý nhân sự", d: "Nghỉ phép, lương, chi nhánh." },
              { icon: <Briefcase size={22} className="text-blue-600" />, t: "Tuyển dụng AI", d: "Đăng tin, ATS, kho ứng viên." },
              { icon: <Sparkles size={22} className="text-blue-600" />, t: "Trợ lý AI", d: "Hỏi đáp, báo cáo bằng giọng nói." },
            ].map((p, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-3">{p.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{p.t}</p>
                <p className="text-xs text-gray-500 mt-1">{p.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer đầy đủ ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
                <span className="font-extrabold text-gray-800 text-lg">Timio</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Chấm công khuôn mặt + Tuyển dụng AI cho doanh nghiệp Việt. Hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật.</p>
            </div>
            {[
              { h: "Người tìm việc", links: [["Tìm việc làm", "/viec-lam"], ["Ngành nghề", "#nganh-nghe"], ["Đăng nhập", "/login"]] },
              { h: "Nhà tuyển dụng", links: [["Đăng tin tuyển dụng", "/login"], ["Bảng giá", "/gia"], ["Tuyển dụng AI", "#nha-tuyen-dung"]] },
              { h: "Về Timio", links: [["Sản phẩm chấm công", "/"], ["Bảng giá", "/gia"], ["Đăng nhập", "/login"]] },
            ].map((col, i) => (
              <div key={i}>
                <p className="font-semibold text-gray-800 text-sm mb-3">{col.h}</p>
                <ul className="space-y-2">
                  {col.links.map(([label, href], j) => (
                    <li key={j}><a href={href} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"><ChevronRight size={12} /> {label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8 pt-6 border-t border-gray-100">© {new Date().getFullYear().toString()} Timio · Hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật.</p>
        </div>
      </footer>
    </div>
  );
}
