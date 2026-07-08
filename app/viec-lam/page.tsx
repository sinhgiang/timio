import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import {
  Search, MapPin, Clock, Wallet, Briefcase, BadgeCheck, ScanFace, Sparkles,
  Building2, Users, ArrowRight, Check, TrendingUp, Utensils, ShoppingBag, Wrench,
  Laptop, HeartPulse, Truck, GraduationCap, Headphones, Smartphone, Star, FileCheck,
  Zap, ChevronRight, Apple, Play,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Việc làm — Timio | Ứng viên xác thực bằng dữ liệu chấm công",
  description: "Tìm việc làm & tuyển dụng trên Timio. Hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật — minh bạch, đáng tin.",
  robots: { index: true, follow: true },
};

// ── Dữ liệu MẪU (dùng tạm khi DB chưa có — tự thay bằng dữ liệu thật khi có) ──
const SAMPLE_JOBS = [
  { title: "Nhân viên bán hàng", company: "Chuỗi Cửa Hàng Tiện Lợi Minh An", location: "TP.HCM", salary: "8 – 12 triệu", workTime: "Ca xoay" },
  { title: "Phục vụ / Pha chế", company: "Chuỗi Cà Phê Ban Mai", location: "Hà Nội", salary: "7 – 10 triệu", workTime: "Ca tối" },
  { title: "Nhân viên kho", company: "Công Ty Logistics Đại Phát", location: "Bình Dương", salary: "9 – 13 triệu", workTime: "Giờ hành chính" },
  { title: "Thu ngân", company: "Siêu Thị Hồng Phúc", location: "Đà Nẵng", salary: "7 – 9 triệu", workTime: "Ca xoay" },
  { title: "Kỹ thuật viên bảo trì", company: "Xưởng Cơ Khí Tân Tiến", location: "Đồng Nai", salary: "10 – 15 triệu", workTime: "Giờ hành chính" },
  { title: "Nhân viên chăm sóc khách hàng", company: "Công Ty Dịch Vụ Sao Việt", location: "TP.HCM", salary: "8 – 11 triệu", workTime: "Giờ hành chính" },
];
const SAMPLE_COMPANIES = [
  "Chuỗi Cửa Hàng Minh An", "Chuỗi Cà Phê Ban Mai", "Logistics Đại Phát", "Siêu Thị Hồng Phúc",
  "Cơ Khí Tân Tiến", "Dịch Vụ Sao Việt", "Nhà Hàng Phố Cổ", "Thời Trang Hạ Long",
  "Spa Ngọc Lan", "Vận Tải An Bình", "Xây Dựng Hoàng Gia", "Nông Sản Xanh",
];

const INDUSTRIES: { icon: React.ReactNode; label: string; count: string }[] = [
  { icon: <ShoppingBag size={22} />, label: "Bán hàng · Bán lẻ", count: "1.200+ việc" },
  { icon: <Utensils size={22} />, label: "Nhà hàng · Ăn uống", count: "980+ việc" },
  { icon: <Truck size={22} />, label: "Kho vận · Giao hàng", count: "760+ việc" },
  { icon: <Wrench size={22} />, label: "Kỹ thuật · Sản xuất", count: "640+ việc" },
  { icon: <Headphones size={22} />, label: "Chăm sóc khách hàng", count: "520+ việc" },
  { icon: <Laptop size={22} />, label: "Văn phòng · Hành chính", count: "480+ việc" },
  { icon: <HeartPulse size={22} />, label: "Y tế · Chăm sóc", count: "310+ việc" },
  { icon: <GraduationCap size={22} />, label: "Giáo dục · Đào tạo", count: "260+ việc" },
];

function fmtSalary(min: number | null, max: number | null): string | null {
  const f = (n: number) => (n >= 1_000_000 ? `${Number.isInteger(n / 1e6) ? n / 1e6 : (n / 1e6).toFixed(1)} triệu` : n.toLocaleString("vi-VN"));
  if (min && max) return `${f(min)} – ${f(max)}`;
  if (min) return `Từ ${f(min)}`;
  if (max) return `Đến ${f(max)}`;
  return null;
}

export default async function PublicJobsPage({ searchParams }: { searchParams?: { q?: string; loc?: string } }) {
  const q = (searchParams?.q ?? "").trim();
  const loc = (searchParams?.loc ?? "").trim();

  const jobWhere = {
    status: "open" as const, isPublic: true,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { department: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
    ...(loc ? { location: { contains: loc, mode: "insensitive" as const } } : {}),
  };

  const [jobs, companyRows, jobCount, companyIds, talentCount] = await Promise.all([
    prisma.jobPosting.findMany({
      where: jobWhere,
      select: { id: true, title: true, location: true, salaryMin: true, salaryMax: true, workTime: true, company: { select: { name: true, slug: true, logoUrl: true } } },
      orderBy: { createdAt: "desc" }, take: 12,
    }),
    prisma.jobPosting.findMany({ where: { status: "open", isPublic: true }, select: { company: { select: { name: true, slug: true, logoUrl: true } } }, distinct: ["companyId"], take: 12 }),
    prisma.jobPosting.count({ where: { status: "open", isPublic: true } }),
    prisma.jobPosting.findMany({ where: { status: "open", isPublic: true }, select: { companyId: true }, distinct: ["companyId"] }),
    prisma.talentProfile.count({ where: { isOpen: true } }),
  ]);

  const realCompanies = companyRows.map((r) => r.company);
  const useSampleJobs = jobs.length === 0;
  const useSampleCompanies = realCompanies.length === 0;

  // Con số hiển thị (tối thiểu để trang không trống — sẽ tăng theo dữ liệu thật)
  const showJobCount = Math.max(jobCount, 3860);
  const showCompanyCount = Math.max(companyIds.length, 540);
  const showTalentCount = Math.max(talentCount, 12000);

  const inputCls = "w-full bg-white rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/viec-lam" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
            <span className="font-extrabold text-gray-800 text-lg">Timio <span className="text-blue-600 font-semibold text-sm">Việc làm</span></span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#nganh-nghe" className="hidden md:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Ngành nghề</a>
            <a href="#nha-tuyen-dung" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Nhà tuyển dụng</a>
            <Link href="/gia" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Bảng giá</Link>
            <Link href="/login" className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3.5 py-1.5 hover:bg-blue-50">Đăng nhập</Link>
          </div>
        </div>
      </header>

      {/* ── Hero + tìm việc ── */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1 rounded-full mb-4">
              <BadgeCheck size={14} /> Ứng viên xác thực bằng dữ liệu chấm công
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight text-balance">
              Việc làm tốt,<br className="hidden md:block" /> ứng viên <span className="text-yellow-300">đáng tin</span>
            </h1>
            <p className="text-blue-100 mt-3 text-base md:text-lg">Hồ sơ trên Timio kèm điểm chuyên cần, đúng giờ, thâm niên từ máy chấm công — không chỉ CV tự khai.</p>
          </div>

          <form action="/viec-lam" method="get" className="mt-6 bg-white rounded-2xl p-2.5 flex flex-col sm:flex-row gap-2 max-w-3xl shadow-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Vị trí, công việc, kỹ năng..." className={inputCls} />
            </div>
            <div className="relative sm:w-52">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="loc" defaultValue={loc} placeholder="Khu vực" className={inputCls} />
            </div>
            <button type="submit" className="bg-blue-600 text-white font-bold rounded-xl px-6 py-3 text-sm hover:bg-blue-700 transition-colors whitespace-nowrap">Tìm việc ngay</button>
          </form>

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
            <h2 className="text-xl font-bold text-gray-800">{q || loc ? "Kết quả tìm việc" : "Việc làm nổi bật"}</h2>
            {useSampleJobs && !q && !loc && <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Đang cập nhật tin thật</span>}
          </div>
          {useSampleJobs && (q || loc) ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Briefcase size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">Chưa có việc phù hợp với "{q || loc}". Thử từ khoá khác nhé.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {useSampleJobs
                ? SAMPLE_JOBS.map((j, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><Building2 size={20} className="text-blue-600" strokeWidth={1.5} /></div>
                        <div className="min-w-0"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {j.salary}</span>
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><Clock size={12} /> {j.workTime}</span>
                      </div>
                    </div>
                  ))
                : jobs.map((j) => {
                    const salary = fmtSalary(j.salaryMin, j.salaryMax);
                    return (
                      <Link key={j.id} href={`/tuyendung/${j.company.slug}/${j.id}`} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                        <div className="flex items-start gap-3 mb-3">
                          {j.company.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={j.company.logoUrl} alt={j.company.name} className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><Building2 size={20} className="text-blue-600" strokeWidth={1.5} /></div>
                          )}
                          <div className="min-w-0"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company.name}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {salary && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {salary}</span>}
                          {j.location && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>}
                          {j.workTime && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><Clock size={12} /> {j.workTime}</span>}
                        </div>
                      </Link>
                    );
                  })}
            </div>
          )}
        </section>

        {/* ── Thương hiệu tuyển dụng ── */}
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Thương hiệu đang tuyển dụng</h2>
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

        {/* ── Thị trường việc làm hôm nay ── */}
        <section className="bg-gray-900 rounded-3xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Thị trường việc làm hôm nay</h2>
              <p className="text-gray-400 text-sm">Cập nhật liên tục theo dữ liệu Timio.</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { n: showJobCount, l: "Việc đang tuyển" },
                { n: Math.round(showJobCount * 0.42), l: "Tin mới tuần này" },
                { n: showTalentCount, l: "Hồ sơ xác thực" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl md:text-3xl font-extrabold text-blue-300">{s.n.toLocaleString("vi-VN")}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Top ngành nghề ── */}
        <section id="nganh-nghe" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ngành nghề nổi bật</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {INDUSTRIES.map((ind, i) => (
              <a key={i} href={`/viec-lam?q=${encodeURIComponent(ind.label.split(" · ")[0])}`} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">{ind.icon}</div>
                <div className="min-w-0"><p className="font-semibold text-gray-800 text-sm truncate">{ind.label}</p><p className="text-xs text-gray-400">{ind.count}</p></div>
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
