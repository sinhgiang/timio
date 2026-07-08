import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import {
  Search, MapPin, Clock, Wallet, Briefcase, BadgeCheck, ScanFace, Sparkles,
  Building2, Users, ArrowRight, Check, TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Việc làm — Timio | Ứng viên xác thực bằng dữ liệu chấm công",
  description: "Tìm việc làm từ các doanh nghiệp dùng Timio. Hồ sơ ứng viên được xác thực bằng dữ liệu chấm công thật — minh bạch, đáng tin.",
  robots: { index: true, follow: true },
};

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
    status: "open" as const,
    isPublic: true,
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
      select: {
        id: true, title: true, department: true, location: true, salaryMin: true, salaryMax: true,
        workTime: true, quantity: true, createdAt: true,
        company: { select: { name: true, slug: true, logoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.jobPosting.findMany({
      where: { status: "open", isPublic: true },
      select: { company: { select: { name: true, slug: true, logoUrl: true } } },
      distinct: ["companyId"],
      take: 18,
    }),
    prisma.jobPosting.count({ where: { status: "open", isPublic: true } }),
    prisma.jobPosting.findMany({ where: { status: "open", isPublic: true }, select: { companyId: true }, distinct: ["companyId"] }),
    prisma.talentProfile.count({ where: { isOpen: true } }),
  ]);

  const companies = companyRows.map((r) => r.company).filter((c) => c);
  const companyCount = companyIds.length;

  const inputCls = "w-full bg-white/95 rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/viec-lam" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
            <span className="font-extrabold text-gray-800 text-lg">Timio <span className="text-blue-600 font-semibold text-sm">Việc làm</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#nha-tuyen-dung" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Cho nhà tuyển dụng</a>
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
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-balance">
              Tìm việc & tuyển người<br className="hidden md:block" /> dựa trên <span className="text-yellow-300">bằng chứng thật</span>
            </h1>
            <p className="text-blue-100 mt-3 text-base md:text-lg">Không chỉ CV tự khai — hồ sơ trên Timio kèm điểm chuyên cần, đúng giờ, thâm niên từ máy chấm công.</p>
          </div>

          {/* Ô tìm việc (form GET) */}
          <form action="/viec-lam" method="get" className="mt-6 bg-white/10 backdrop-blur rounded-2xl p-2.5 flex flex-col sm:flex-row gap-2 max-w-3xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Vị trí, công việc, kỹ năng..." className={inputCls} />
            </div>
            <div className="relative sm:w-52">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="loc" defaultValue={loc} placeholder="Khu vực" className={inputCls} />
            </div>
            <button type="submit" className="bg-yellow-400 text-gray-900 font-bold rounded-xl px-6 py-3 text-sm hover:bg-yellow-300 transition-colors whitespace-nowrap">Tìm việc</button>
          </form>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-5 text-sm text-blue-100">
            <span className="flex items-center gap-1.5"><Briefcase size={15} /> {jobCount.toLocaleString("vi-VN")} việc đang tuyển</span>
            <span className="flex items-center gap-1.5"><Building2 size={15} /> {companyCount.toLocaleString("vi-VN")} công ty</span>
            <span className="flex items-center gap-1.5"><BadgeCheck size={15} /> {talentCount.toLocaleString("vi-VN")} hồ sơ xác thực</span>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* ── Việc làm nổi bật ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">{q || loc ? "Kết quả tìm việc" : "Việc làm nổi bật"}</h2>
            {jobs.length > 0 && <span className="text-sm text-gray-400">{jobs.length} vị trí</span>}
          </div>
          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Briefcase size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">{q || loc ? "Không tìm thấy việc phù hợp. Thử từ khoá khác nhé." : "Hiện chưa có tin tuyển dụng công khai."}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {jobs.map((j) => {
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
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 leading-tight line-clamp-2">{j.title}</h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{j.company.name}</p>
                      </div>
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

        {/* ── Công ty đang tuyển ── */}
        {companies.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Công ty đang tuyển</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {companies.map((c) => (
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
        )}

        {/* ── Điểm khác biệt Timio ── */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Vì sao Timio khác biệt?</h2>
            <p className="text-gray-500 mt-1">Điều mà các trang tuyển dụng thông thường không có.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: <BadgeCheck size={24} className="text-blue-600" />, title: "Hồ sơ xác thực bằng chấm công", desc: "Đúng giờ, chuyên cần, thâm niên — ghi bằng máy, không phải tự khai. Nhà tuyển dụng tin ngay." },
              { icon: <ScanFace size={24} className="text-blue-600" />, title: "Tuyển xong là đi làm ngay", desc: "Từ ứng viên → nhân viên chấm công bằng khuôn mặt chỉ trong 1 chạm. Không cần mua máy." },
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

        {/* ── Con số ── */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { n: companyCount, label: "Công ty tuyển dụng", icon: <Building2 size={20} /> },
              { n: jobCount, label: "Việc làm đang mở", icon: <Briefcase size={20} /> },
              { n: talentCount, label: "Hồ sơ xác thực", icon: <BadgeCheck size={20} /> },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex justify-center text-blue-200 mb-1">{s.icon}</div>
                <p className="text-3xl md:text-4xl font-extrabold">{s.n.toLocaleString("vi-VN")}</p>
                <p className="text-sm text-blue-100 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dành cho nhà tuyển dụng ── */}
        <section id="nha-tuyen-dung" className="bg-white rounded-3xl border border-gray-200 p-8 scroll-mt-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full mb-3"><Users size={13} /> Dành cho nhà tuyển dụng</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Đăng tin & tuyển người ngay trong phần mềm chấm công</h2>
              <ul className="space-y-2 mb-5">
                {[
                  "Trang tuyển dụng riêng cho công ty — đăng tin miễn phí",
                  "Quản lý ứng viên (kanban) + tuyển 1 chạm thành nhân viên chấm công",
                  "AI viết tin, chấm điểm, đánh giá theo tiêu chí",
                  "Kho ứng viên xác thực bằng dữ liệu chấm công",
                ].map((t, i) => (
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
              <p className="text-[11px] text-gray-400 mt-3">Dùng điện thoại/kiosk thay máy chấm công — tiết kiệm chi phí đầu tư.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
              <div>
                <p className="font-bold text-gray-800">Timio</p>
                <p className="text-xs text-gray-400">Chấm công khuôn mặt + Tuyển dụng AI cho doanh nghiệp Việt</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link href="/gia" className="hover:text-blue-600">Bảng giá</Link>
              <a href="#nha-tuyen-dung" className="hover:text-blue-600">Nhà tuyển dụng</a>
              <Link href="/login" className="hover:text-blue-600">Đăng nhập</Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">© {new Date().getFullYear().toString()} Timio · Hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật.</p>
        </div>
      </footer>
    </div>
  );
}
