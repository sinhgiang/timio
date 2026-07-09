import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import SaveJobButton from "@/components/recruitment/SaveJobButton";
import {
  Search, MapPin, Clock, Wallet, Briefcase, BadgeCheck, Building2, Send,
  ChevronRight, Flame, Users, Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Việc làm hấp dẫn — Timio | Việc lương tốt, công ty uy tín đang tuyển",
  description: "Việc làm hấp dẫn nhất trên Timio: lương tốt, công ty uy tín, tuyển gấp. Ứng viên xác thực bằng dữ liệu chấm công thật.",
  robots: { index: true, follow: true },
};

const SALARY_OPTIONS = [
  { v: "", l: "Mức lương" }, { v: "8000000", l: "Từ 8 triệu" }, { v: "12000000", l: "Từ 12 triệu" },
  { v: "15000000", l: "Từ 15 triệu" }, { v: "20000000", l: "Từ 20 triệu" },
];
const LOCATIONS = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Bình Dương", "Đồng Nai", "Hải Phòng", "Cần Thơ"];
const SAMPLE = [
  { title: "Trưởng nhóm kinh doanh", company: "Bất Động Sản Hưng Thịnh", location: "Hà Nội", salary: "20 – 40 triệu", tags: ["thưởng hấp dẫn", "có đào tạo"] },
  { title: "Nhân viên Marketing", company: "Thương Mại Điện Tử Sao Việt", location: "TP.HCM", salary: "12 – 18 triệu", tags: ["marketing", "content", "tiktok"] },
  { title: "Kỹ sư tự động hóa", company: "Cơ Khí Chính Xác Đại Phát", location: "Bình Dương", salary: "15 – 25 triệu", tags: ["kỹ thuật", "giờ hành chính"] },
  { title: "Chuyên viên chăm sóc khách hàng", company: "Dịch Vụ Tài Chính An Bình", location: "Hà Nội", salary: "10 – 15 triệu", tags: ["chăm sóc khách hàng", "không cần kinh nghiệm"] },
  { title: "Nhân viên bán hàng showroom", company: "Ô Tô Trường Hải", location: "Đà Nẵng", salary: "12 – 20 triệu", tags: ["bán hàng", "hoa hồng cao"] },
  { title: "Kế toán tổng hợp", company: "Nông Sản Xanh Miền Tây", location: "Cần Thơ", salary: "10 – 14 triệu", tags: ["kế toán", "giờ hành chính"] },
];

function fmtSalary(min: number | null, max: number | null): string | null {
  const f = (n: number) => (n >= 1_000_000 ? `${Number.isInteger(n / 1e6) ? n / 1e6 : (n / 1e6).toFixed(1)} triệu` : n.toLocaleString("vi-VN"));
  if (min && max) return `${f(min)} – ${f(max)}`;
  if (min) return `Từ ${f(min)}`;
  if (max) return `Đến ${f(max)}`;
  return null;
}

export default async function HotJobsPage({ searchParams }: { searchParams?: { q?: string; loc?: string; sal?: string } }) {
  const q = (searchParams?.q ?? "").trim();
  const loc = (searchParams?.loc ?? "").trim();
  const salMin = Number(searchParams?.sal) || 0;

  const where = {
    status: "open" as const, isPublic: true,
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { department: { contains: q, mode: "insensitive" as const } },
      { tags: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
    ...(loc ? { location: { contains: loc, mode: "insensitive" as const } } : {}),
    ...(salMin ? { salaryMin: { gte: salMin } } : {}),
  };

  const jobs = await prisma.jobPosting.findMany({
    where,
    select: { id: true, title: true, location: true, salaryMin: true, salaryMax: true, workTime: true, tags: true, department: true, company: { select: { name: true, slug: true, logoUrl: true } } },
    orderBy: [{ salaryMax: "desc" }, { createdAt: "desc" }],
    take: 24,
  });

  const useSample = jobs.length === 0;
  const hasFilter = !!(q || loc || salMin);
  const inputCls = "w-full bg-white rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 border border-transparent";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/viec-lam" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
            <span className="font-extrabold text-gray-800 text-lg">Timio <span className="text-blue-600 font-semibold text-sm">Việc làm</span></span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/viec-lam" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Việc làm</Link>
            <Link href="/viec-lam-hap-dan" className="text-sm font-semibold text-orange-600 px-3 py-1.5">Việc làm hấp dẫn</Link>
            <Link href="/ung-vien" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Ứng viên</Link>
            <Link href="/login" className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3.5 py-1.5 hover:bg-blue-50">Đăng nhập</Link>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-orange-500 via-rose-500 to-red-500 text-white overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 px-3 py-1 rounded-full mb-4"><Flame size={14} /> Tuyển gấp · Lương tốt</div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-balance">Việc làm <span className="text-yellow-200">hấp dẫn nhất</span></h1>
            <p className="text-orange-50 mt-3 text-base">Lương tốt, công ty uy tín đang tuyển — nộp hồ sơ xác thực, được ưu tiên phản hồi.</p>
          </div>
          <form action="/viec-lam-hap-dan" method="get" className="mt-6 bg-white rounded-2xl p-2.5 flex flex-col md:flex-row gap-2 max-w-4xl shadow-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Vị trí, kỹ năng, thẻ..." className={inputCls} />
            </div>
            <div className="relative md:w-44">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="loc" defaultValue={loc} placeholder="Khu vực" className={inputCls} />
            </div>
            <select name="sal" defaultValue={searchParams?.sal || ""} className="md:w-40 bg-white rounded-xl px-3 py-3 text-sm text-gray-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-orange-300">
              {SALARY_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
            <button type="submit" className="bg-orange-600 text-white font-bold rounded-xl px-6 py-3 text-sm hover:bg-orange-700 whitespace-nowrap">Tìm ngay</button>
          </form>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-orange-100">Địa điểm:</span>
            {LOCATIONS.map((l) => <a key={l} href={`/viec-lam-hap-dan?loc=${encodeURIComponent(l)}`} className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1">{l}</a>)}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Flame size={20} className="text-orange-500" /> {hasFilter ? "Kết quả" : "Việc làm hấp dẫn"}</h2>
            <Link href="/viec-lam" className="text-sm text-blue-600 hover:underline flex items-center gap-0.5">Tất cả việc làm <ChevronRight size={14} /></Link>
          </div>

          {useSample && hasFilter ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Briefcase size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">Chưa có việc phù hợp với bộ lọc. Thử từ khoá / khu vực khác nhé.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {useSample
                ? SAMPLE.map((j, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><Building2 size={20} className="text-orange-500" strokeWidth={1.5} /></div>
                        <div className="min-w-0 flex-1"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company}</p></div>
                        <span className="text-[9px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded h-fit">HOT</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {j.salary}</span>
                        <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">{j.tags.map((t, k) => <span key={k} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t}</span>)}</div>
                      <span className="mt-auto text-center text-xs text-orange-600 border border-orange-200 rounded-lg py-1.5">Ứng tuyển ngay</span>
                    </div>
                  ))
                : jobs.map((j) => {
                    const salary = fmtSalary(j.salaryMin, j.salaryMax);
                    const tags = (j.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
                    return (
                      <div key={j.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-orange-300 hover:shadow-md transition-all flex flex-col">
                        <div className="flex items-start gap-3 mb-3">
                          {j.company.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={j.company.logoUrl} alt={j.company.name} className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"><Building2 size={20} className="text-orange-500" strokeWidth={1.5} /></div>
                          )}
                          <Link href={`/tuyendung/${j.company.slug}/${j.id}`} className="min-w-0 flex-1"><h3 className="font-semibold text-gray-800 leading-tight line-clamp-2 hover:text-orange-600">{j.title}</h3><p className="text-xs text-gray-500 truncate mt-0.5">{j.company.name}</p></Link>
                          <SaveJobButton jobKey={j.id} />
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {salary && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-1 rounded-lg"><Wallet size={12} /> {salary}</span>}
                          {j.location && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><MapPin size={12} /> {j.location}</span>}
                          {j.workTime && <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-600 text-xs px-2 py-1 rounded-lg"><Clock size={12} /> {j.workTime}</span>}
                        </div>
                        {tags.length > 0 && <div className="flex flex-wrap gap-1 mb-3">{tags.slice(0, 5).map((t, i) => <a key={i} href={`/viec-lam-hap-dan?q=${encodeURIComponent(t)}`} className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full">{t}</a>)}</div>}
                        <Link href={`/tuyendung/${j.company.slug}/${j.id}`} className="mt-auto flex items-center justify-center gap-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-orange-700"><Send size={14} /> Ứng tuyển ngay</Link>
                      </div>
                    );
                  })}
            </div>
          )}
          {useSample && !hasFilter && <p className="text-[11px] text-gray-400 mt-3 text-center">Đang cập nhật tin thật. Danh sách mẫu minh hoạ.</p>}
        </section>

        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full mb-2"><Sparkles size={13} /> Cho nhà tuyển dụng</div>
            <h2 className="text-2xl font-bold mb-1.5">Đăng tin miễn phí — lên mục việc làm hấp dẫn</h2>
            <p className="text-blue-100 text-sm">Gắn thẻ cho tin để người tìm việc dễ thấy. Kho ứng viên xác thực bằng chấm công thật.</p>
          </div>
          <Link href="/login" className="shrink-0 inline-flex items-center gap-1.5 bg-white text-blue-700 font-bold rounded-xl px-6 py-3 text-sm hover:bg-blue-50">Đăng tin ngay <Users size={15} /></Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5"><BadgeCheck size={13} /> Ứng viên xác thực bằng dữ liệu chấm công thật · Timio</p>
        </div>
      </footer>
    </div>
  );
}
