import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { computeTrustScore } from "@/lib/trustScore";
import { candidateDisplayName } from "@/lib/candidateVisibility";
import {
  Search, MapPin, ShieldCheck, Clock, BadgeCheck, Award, Briefcase, Lock,
  Building2, Users, ArrowRight, ChevronRight, Star,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ứng viên xác thực — Timio | Người tìm việc có điểm tin cậy từ chấm công",
  description: "Tìm ứng viên đáng tin trên Timio: hồ sơ kèm điểm chuyên cần, đúng giờ, thâm niên từ máy chấm công thật. Người lao động tự nguyện chia sẻ (opt-in).",
  robots: { index: true, follow: true },
};

const LEVEL: Record<string, string> = {
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  bronze: "bg-orange-100 text-orange-700 border-orange-200",
  new: "bg-gray-100 text-gray-500 border-gray-200",
};
const expLabel = (m: number) => m <= 0 ? "Mới" : m < 12 ? `${m} tháng` : `${Math.floor(m / 12)} năm`;

// Ứng viên MẪU (khi dữ liệu thật còn ít) — tên đã che sẵn, không phải người thật
const SAMPLE = [
  { name: "Nguyễn Văn H.", position: "Lễ tân khách sạn", area: "Lào Cai", score: 82, level: "silver", exp: 14, tags: ["chăm chỉ", "biết tiếng Anh", "giao tiếp tốt"] },
  { name: "Trần Thị M.", position: "Nhân viên bán hàng", area: "Hà Nội", score: 88, level: "gold", exp: 26, tags: ["bán hàng", "chăm sóc khách hàng"] },
  { name: "Lê Quốc T.", position: "Tài xế giao hàng", area: "TP.HCM", score: 79, level: "silver", exp: 9, tags: ["có xe máy", "đúng giờ"] },
  { name: "Phạm Thị L.", position: "Pha chế", area: "Đà Nẵng", score: 75, level: "silver", exp: 7, tags: ["làm ca tối", "nhanh nhẹn"] },
  { name: "Hoàng Văn K.", position: "Nhân viên kho", area: "Bình Dương", score: 84, level: "silver", exp: 18, tags: ["chịu khó", "kho vận"] },
  { name: "Vũ Thị N.", position: "Thu ngân", area: "Cần Thơ", score: 90, level: "gold", exp: 30, tags: ["trung thực", "tin học văn phòng"] },
  { name: "Đặng Minh Q.", position: "Kỹ thuật viên", area: "Đồng Nai", score: 77, level: "silver", exp: 11, tags: ["kỹ thuật", "sửa chữa"] },
  { name: "Bùi Thị H.", position: "Chăm sóc khách hàng", area: "Hải Phòng", score: 81, level: "silver", exp: 15, tags: ["giao tiếp tốt", "kiên nhẫn"] },
  { name: "Ngô Văn D.", position: "Phục vụ nhà hàng", area: "TP.HCM", score: 72, level: "silver", exp: 6, tags: ["chăm chỉ", "làm cuối tuần"] },
];

export default async function CandidatesPage({ searchParams }: { searchParams?: { q?: string; area?: string } }) {
  const q = (searchParams?.q ?? "").toLowerCase().trim();
  const area = (searchParams?.area ?? "").trim();

  const workers = await prisma.workerAccount.findMany({
    where: { openToWork: true, profilePublic: true, activatedAt: { not: null } },
    select: { id: true, name: true, handle: true, desiredArea: true, desiredPosition: true, keywords: true, shareTrustScore: true },
    take: 36,
  });

  const ids = workers.map((w) => w.id);
  const emps = ids.length ? await prisma.employee.findMany({ where: { workerAccountId: { in: ids } }, select: { id: true, workerAccountId: true, status: true, position: true, joinDate: true } }) : [];
  const activeSet = new Set(emps.filter((e) => e.status === "active").map((e) => e.workerAccountId!));
  const empIds = emps.map((e) => e.id);
  const empToW = new Map(emps.map((e) => [e.id, e.workerAccountId!]));

  const [totalG, onTimeG] = empIds.length ? await Promise.all([
    prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null } }, _count: { _all: true } }),
    prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 }, _count: { _all: true } }),
  ]) : [[], []];

  const now = Date.now();
  const totalByW = new Map<string, number>(), onTimeByW = new Map<string, number>(), earliestByW = new Map<string, number>(), posByW = new Map<string, string>();
  for (const g of totalG as { employeeId: string; _count: { _all: number } }[]) { const w = empToW.get(g.employeeId); if (w) totalByW.set(w, (totalByW.get(w) ?? 0) + g._count._all); }
  for (const g of onTimeG as { employeeId: string; _count: { _all: number } }[]) { const w = empToW.get(g.employeeId); if (w) onTimeByW.set(w, (onTimeByW.get(w) ?? 0) + g._count._all); }
  for (const e of emps) { if (e.joinDate) { const t = e.joinDate.getTime(); const c = earliestByW.get(e.workerAccountId!); if (c === undefined || t < c) earliestByW.set(e.workerAccountId!, t); } if (e.position && !posByW.has(e.workerAccountId!)) posByW.set(e.workerAccountId!, e.position); }

  let candidates = workers.map((w) => {
    const total = totalByW.get(w.id) ?? 0;
    const onTime = onTimeByW.get(w.id) ?? 0;
    const rate = total > 0 ? Math.round((onTime / total) * 100) : null;
    const earliest = earliestByW.get(w.id);
    const exp = earliest ? Math.max(0, Math.round((now - earliest) / (30 * 86400000))) : 0;
    const trust = computeTrustScore({ punctualityRate: rate, totalDaysWorked: total, experienceMonths: exp });
    const employed = activeSet.has(w.id);
    return {
      name: candidateDisplayName(w.name, employed),
      employed,
      // Chỉ cho xem hồ sơ đầy đủ khi KHÔNG đang đi làm (bảo vệ người đang có việc)
      handle: !employed ? w.handle : null,
      position: w.desiredPosition || posByW.get(w.id) || "Chưa ghi vị trí",
      area: w.desiredArea || "",
      score: w.shareTrustScore ? trust.score : null,
      level: w.shareTrustScore ? trust.level : "new",
      exp,
      tags: (w.keywords || "").split(",").map((k) => k.trim()).filter(Boolean),
    };
  })
    .filter((c) => !area || c.area === area)
    .filter((c) => !q || c.position.toLowerCase().includes(q) || c.area.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const useSample = candidates.length === 0;
  const hasFilter = !!(q || area);
  const inputCls = "w-full bg-white rounded-xl pl-10 pr-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-transparent";

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
            <Link href="/viec-lam-hap-dan" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Việc làm hấp dẫn</Link>
            <Link href="/ung-vien" className="text-sm font-semibold text-blue-600 px-3 py-1.5">Ứng viên</Link>
            <Link href="/login" className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3.5 py-1.5 hover:bg-blue-50">Đăng nhập</Link>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-600 text-white overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1 rounded-full mb-4"><BadgeCheck size={14} /> Hồ sơ xác thực bằng dữ liệu chấm công</div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-balance">Ứng viên đáng tin, <span className="text-yellow-300">chọn mặt gửi vàng</span></h1>
            <p className="text-blue-100 mt-3 text-base">Người lao động có điểm chuyên cần, đúng giờ, thâm niên từ máy chấm công thật — tự nguyện chia sẻ để tìm việc tốt hơn.</p>
          </div>
          <form action="/ung-vien" method="get" className="mt-6 bg-white rounded-2xl p-2.5 flex flex-col md:flex-row gap-2 max-w-3xl shadow-xl">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="q" defaultValue={q} placeholder="Vị trí, kỹ năng ứng viên..." className={inputCls} />
            </div>
            <div className="relative md:w-48">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input name="area" defaultValue={area} placeholder="Khu vực" className={inputCls} />
            </div>
            <button type="submit" className="bg-blue-600 text-white font-bold rounded-xl px-6 py-3 text-sm hover:bg-blue-700 whitespace-nowrap">Tìm ứng viên</button>
          </form>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <Lock size={15} className="shrink-0" />
          Người đang đi làm mà tìm việc mới được <b>che nửa tên</b> để bảo vệ. Chỉ hiện đầy đủ khi họ không còn ràng buộc công ty nào.
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">{hasFilter ? "Kết quả ứng viên" : "Ứng viên nổi bật"}</h2>
            <Link href="/viec-lam" className="text-sm text-blue-600 hover:underline flex items-center gap-0.5">Xem việc làm <ChevronRight size={14} /></Link>
          </div>

          {useSample && hasFilter ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Users size={36} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-500">Chưa có ứng viên khớp bộ lọc. Thử từ khoá / khu vực khác nhé.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(useSample ? SAMPLE : candidates).map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0">{c.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                        {c.score != null && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL[c.level] ?? LEVEL.new}`}>{c.score}</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{c.position}{c.area ? ` · ${c.area}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2 flex-wrap">
                    {c.score != null && <span className="inline-flex items-center gap-1"><Award size={12} className="text-amber-500" /> Đáng tin</span>}
                    <span className="inline-flex items-center gap-1"><Briefcase size={12} /> {expLabel(c.exp)}</span>
                    {("employed" in c && c.employed) && <span className="inline-flex items-center gap-1 text-gray-400"><Lock size={11} /> Đang đi làm</span>}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {c.tags.slice(0, 5).map((t, j) => <span key={j} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t}</span>)}
                    </div>
                  )}
                  {("handle" in c && c.handle) ? (
                    <Link href={`/ho-so/${c.handle}`} className="mt-auto flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700">Xem hồ sơ <ArrowRight size={14} /></Link>
                  ) : (
                    <div className="mt-auto flex items-center justify-center gap-1.5 border border-gray-200 text-gray-500 text-sm rounded-lg py-2"><Lock size={13} /> Liên hệ qua nhà tuyển dụng</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {useSample && !hasFilter && <p className="text-[11px] text-gray-400 mt-3 text-center">Đang cập nhật ứng viên thật. Danh sách mẫu minh hoạ.</p>}
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full mb-3"><ShieldCheck size={13} /> Cho người lao động</span>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Hồ sơ của bạn — bạn làm chủ</h2>
              <ul className="space-y-2 mb-5">
                {["Điểm tin cậy xây từ chấm công thật, mang đi xin việc", "Đang đi làm vẫn tìm việc mới an toàn — che nửa tên", "Bật/tắt hiển thị bất cứ lúc nào (opt-in)"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><Star size={16} className="text-blue-500 shrink-0 mt-0.5" /> {t}</li>
                ))}
              </ul>
              <Link href="/nhanvien" className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-medium rounded-xl px-5 py-2.5 text-sm hover:bg-blue-700">Tạo hồ sơ của tôi <ArrowRight size={15} /></Link>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-3"><Building2 size={18} className="text-blue-600" /><span className="font-semibold text-gray-800 text-sm">Cho nhà tuyển dụng</span></div>
              <p className="text-sm text-gray-600 mb-3">Đăng nhập để dùng <b>Kho ứng viên xác thực</b> — lọc theo nghề, khu vực, điểm tin cậy và kết nối trực tiếp (ứng viên đồng ý mới lộ liên hệ).</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 border border-blue-200 text-blue-700 font-medium rounded-xl px-5 py-2.5 text-sm hover:bg-blue-50">Vào kho ứng viên <ArrowRight size={15} /></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-gray-400">Hồ sơ do người lao động sở hữu và tự nguyện chia sẻ (opt-in) — đúng Luật Bảo vệ Dữ liệu Cá nhân.</p>
        </div>
      </footer>
    </div>
  );
}
