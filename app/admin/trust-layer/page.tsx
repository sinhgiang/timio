import { prisma } from "@/lib/prisma";
import { computeTrustScore, type TrustLevel } from "@/lib/trustScore";
import { Users, Eye, ShieldCheck, Award, Repeat2, Percent, Clock, Wallet, TrendingUp, UserCheck, Building2 } from "lucide-react";

// Đo lường "Wedge — Lớp độ tin cậy di động" (xem TRUST_LAYER_PLAN.md ở root repo).
// Trang này KHÔNG phải tính năng cho khách hàng — chỉ founder (super_admin) xem để biết
// chiến lược có thực sự "ăn" không, theo đúng 3 mốc chỉ số đã đặt ra trong kế hoạch:
// GĐ1 % NV bật hồ sơ công khai + điểm tin cậy · GĐ2 lượt tái tuyển + thời gian tuyển
// · GĐ3 hạn mức EWA gắn điểm + tỷ lệ giữ chân.

function monthsBetween(a: Date, b: Date) {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}
function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}
function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

const LEVEL_LABEL: Record<TrustLevel, string> = { new: "Mới", bronze: "Đồng", silver: "Bạc", gold: "Vàng" };
const LEVEL_BAR: Record<TrustLevel, string> = {
  new: "bg-gray-200",
  bronze: "bg-orange-300",
  silver: "bg-slate-400",
  gold: "bg-amber-400",
};

export default async function AdminTrustLayerPage() {
  const now = new Date();

  // ── GĐ1: dân số NV đã kích hoạt tài khoản + hồ sơ của họ ──────────────────
  const workers = await prisma.workerAccount.findMany({
    where: { activatedAt: { not: null } },
    select: { id: true, profilePublic: true, openToWork: true },
  });
  const workerIds = workers.map((w) => w.id);

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: { in: workerIds } },
    select: {
      id: true, workerAccountId: true, joinDate: true, status: true,
      company: { select: { name: true } },
    },
  });
  const empIds = employees.map((e) => e.id);
  const empByWorker = new Map<string, typeof employees>();
  for (const e of employees) {
    if (!e.workerAccountId) continue;
    const list = empByWorker.get(e.workerAccountId) ?? [];
    list.push(e);
    empByWorker.set(e.workerAccountId, list);
  }

  const [totalGroups, onTimeGroups] = empIds.length
    ? await Promise.all([
        prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null } }, _count: { _all: true } }),
        prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 }, _count: { _all: true } }),
      ])
    : [[], []];
  const totalByEmp = new Map(totalGroups.map((g) => [g.employeeId, g._count._all]));
  const onTimeByEmp = new Map(onTimeGroups.map((g) => [g.employeeId, g._count._all]));

  type WorkerTrust = { workerId: string; profilePublic: boolean; score: number | null; level: TrustLevel; companyName: string | null };
  const workerTrusts: WorkerTrust[] = workers.map((w) => {
    const emps = empByWorker.get(w.id) ?? [];
    let totalDaysWorked = 0, onTimeDays = 0;
    for (const e of emps) { totalDaysWorked += totalByEmp.get(e.id) ?? 0; onTimeDays += onTimeByEmp.get(e.id) ?? 0; }
    const punctualityRate = totalDaysWorked > 0 ? Math.round((onTimeDays / totalDaysWorked) * 100) : null;
    const joinDates = emps.map((e) => e.joinDate).filter((d): d is Date => !!d);
    const earliest = joinDates.length ? new Date(Math.min(...joinDates.map((d) => d.getTime()))) : null;
    const experienceMonths = earliest ? monthsBetween(earliest, now) : 0;
    const ts = computeTrustScore({ punctualityRate, totalDaysWorked, experienceMonths });
    const activeEmp = emps.find((e) => e.status === "active");
    return {
      workerId: w.id, profilePublic: w.profilePublic, score: ts.score, level: ts.level,
      companyName: activeEmp?.company.name ?? emps[0]?.company.name ?? null,
    };
  });

  const totalActivated = workers.length;
  const publicCount = workers.filter((w) => w.profilePublic).length;
  const openToWorkCount = workers.filter((w) => w.openToWork).length;
  const scored = workerTrusts.filter((w) => w.score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, w) => s + (w.score ?? 0), 0) / scored.length) : null;
  const levelCounts: Record<TrustLevel, number> = { new: 0, bronze: 0, silver: 0, gold: 0 };
  for (const w of workerTrusts) levelCounts[w.level]++;

  // ── GĐ2: tái tuyển (kho ứng viên xác thực — TalentInterest + WorkerConnection) ─
  const [interests, connections] = await Promise.all([
    prisma.talentInterest.findMany({ select: { status: true, createdAt: true, respondedAt: true } }),
    prisma.workerConnection.findMany({ select: { status: true, createdAt: true, respondedAt: true } }),
  ]);
  const allLeads = [...interests, ...connections];
  const totalLeads = allLeads.length;
  const acceptedLeads = allLeads.filter((l) => l.status === "accepted");
  const responseTimesH = allLeads
    .filter((l) => l.respondedAt)
    .map((l) => (l.respondedAt!.getTime() - l.createdAt.getTime()) / 36e5);
  const avgResponseHours = responseTimesH.length ? Math.round(responseTimesH.reduce((s, h) => s + h, 0) / responseTimesH.length) : null;

  // ── GĐ3: tài chính gắn điểm (EWA) + giữ chân ───────────────────────────────
  const advances = await prisma.salaryAdvance.findMany({ where: { source: "worker", status: { not: "rejected" } }, select: { amount: true, employeeId: true } });
  const empToWorker = new Map(employees.map((e) => [e.id, e.workerAccountId]));
  const trustByWorker = new Map(workerTrusts.map((w) => [w.workerId, w.level]));
  const advanceByLevel: Record<TrustLevel, { count: number; total: number }> = {
    new: { count: 0, total: 0 }, bronze: { count: 0, total: 0 }, silver: { count: 0, total: 0 }, gold: { count: 0, total: 0 },
  };
  let totalAdvanceAmount = 0;
  for (const a of advances) {
    totalAdvanceAmount += a.amount;
    const wid = empToWorker.get(a.employeeId);
    const level: TrustLevel = wid ? trustByWorker.get(wid) ?? "new" : "new";
    advanceByLevel[level].count++;
    advanceByLevel[level].total += a.amount;
  }

  const activeWithAccount = employees.filter((e) => e.status === "active").length;
  const retentionRate = pct(activeWithAccount, employees.length);

  // ── Theo công ty — để chọn cụm pilot đánh dày (GĐ2.2) ──────────────────────
  const companyStats = new Map<string, { name: string; total: number; public: number; scoreSum: number; scoreCount: number }>();
  for (const w of workerTrusts) {
    if (!w.companyName) continue;
    const s = companyStats.get(w.companyName) ?? { name: w.companyName, total: 0, public: 0, scoreSum: 0, scoreCount: 0 };
    s.total++;
    if (w.profilePublic) s.public++;
    if (w.score !== null) { s.scoreSum += w.score; s.scoreCount++; }
    companyStats.set(w.companyName, s);
  }
  const companyRows = Array.from(companyStats.values())
    .map((s) => ({ ...s, publicPct: pct(s.public, s.total), avgScore: s.scoreCount ? Math.round(s.scoreSum / s.scoreCount) : null }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const maxLevelCount = Math.max(1, ...Object.values(levelCounts));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Lớp độ tin cậy — Đo lường Wedge</h1>
        <p className="text-gray-500 text-sm mt-1">
          Chỉ founder xem. Theo dõi 3 mốc trong <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">TRUST_LAYER_PLAN.md</span>: nền tảng điểm tin cậy → vòng tái tuyển → tài chính gắn điểm.
        </p>
      </div>

      {/* ── GĐ1 ── */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-blue-600 mb-3">Giai đoạn 1 · Nền tảng điểm tin cậy</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: "NV đã kích hoạt", value: totalActivated, sub: "tổng WorkerAccount", icon: Users, color: "blue" },
            { label: "Bật hồ sơ công khai", value: `${pct(publicCount, totalActivated)}%`, sub: `${publicCount}/${totalActivated} người`, icon: Eye, color: "green" },
            { label: "Điểm tin cậy TB", value: avgScore ?? "—", sub: scored.length ? `trên ${scored.length} hồ sơ có dữ liệu` : "chưa có ai đủ ngày công", icon: ShieldCheck, color: "purple" },
            { label: "Đang tìm việc (openToWork)", value: openToWorkCount, sub: "sẵn sàng vào kho ứng viên", icon: Award, color: "yellow" },
          ].map((s) => {
            const bg: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", yellow: "bg-yellow-50 text-yellow-600" };
            return (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg[s.color]}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            );
          })}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-4 text-sm">Phân bố hạng tin cậy</h3>
          <div className="space-y-3">
            {(["gold", "silver", "bronze", "new"] as TrustLevel[]).map((lvl) => (
              <div key={lvl} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-14 shrink-0">{LEVEL_LABEL[lvl]}</span>
                <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden">
                  <div className={`h-full ${LEVEL_BAR[lvl]} rounded-lg flex items-center px-3 transition-all`} style={{ width: `${(levelCounts[lvl] / maxLevelCount) * 100}%`, minWidth: levelCounts[lvl] > 0 ? "2rem" : 0 }}>
                    {levelCounts[lvl] > 0 && <span className="text-xs font-bold text-gray-800 whitespace-nowrap">{levelCounts[lvl]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GĐ2 ── */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-3">Giai đoạn 2 · Vòng tái tuyển theo cụm</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[
            { label: "Tổng lượt quan tâm/kết nối", value: totalLeads, sub: "kho ứng viên + talent pool", icon: Repeat2, color: "purple" },
            { label: "Tỷ lệ chấp nhận", value: `${pct(acceptedLeads.length, totalLeads)}%`, sub: `${acceptedLeads.length}/${totalLeads} lượt`, icon: Percent, color: "green" },
            { label: "Thời gian phản hồi TB", value: avgResponseHours !== null ? `${avgResponseHours}h` : "—", sub: "từ lúc quan tâm tới lúc trả lời", icon: Clock, color: "blue" },
          ].map((s) => {
            const bg: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
            return (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg[s.color]}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          Chưa đo được <b>tỷ lệ no-show</b> (mục tiêu học Instawork ~2%) — cần dữ liệu lịch ca (<span className="italic">ShiftAssignment</span>) đầy đủ hơn để so lịch đã xếp với ngày thực đi làm.
        </p>
      </section>

      {/* ── GĐ3 ── */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-green-600 mb-3">Giai đoạn 3 · Tài chính gắn điểm</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[
            { label: "Tổng lượt ứng lương (EWA)", value: advances.length, sub: "NV tự ứng qua app, không tính đơn bị từ chối", icon: Wallet, color: "green" },
            { label: "Tổng tiền yêu cầu ứng", value: fmtCurrency(totalAdvanceAmount), sub: "lũy kế qua EWA (chờ + đã duyệt)", icon: TrendingUp, color: "blue" },
            { label: "Tỷ lệ giữ chân", value: `${retentionRate}%`, sub: `${activeWithAccount}/${employees.length} còn đang làm`, icon: UserCheck, color: "purple" },
          ].map((s) => {
            const bg: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
            return (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg[s.color]}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            );
          })}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Ứng lương theo hạng tin cậy</h3>
          <p className="text-xs text-gray-400 mb-4">Nếu điểm tin cậy đang thật sự "có giá trị", nhóm Vàng/Bạc phải ứng nhiều hơn nhóm Mới (nhờ hạn mức được cộng thêm).</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["gold", "silver", "bronze", "new"] as TrustLevel[]).map((lvl) => (
              <div key={lvl} className="border border-gray-100 rounded-xl p-3 text-center">
                <div className="text-xs font-semibold text-gray-500 mb-1">{LEVEL_LABEL[lvl]}</div>
                <div className="text-lg font-extrabold text-gray-900">{advanceByLevel[lvl].count}</div>
                <div className="text-[11px] text-gray-400">{fmtCurrency(advanceByLevel[lvl].total)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Theo công ty — chọn cụm pilot ── */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Theo công ty · nơi nào sẵn sàng làm cụm pilot</h2>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {companyRows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">Chưa có công ty nào có nhân viên dùng app</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Công ty</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">NV có tài khoản</th>
                    <th className="text-right px-4 py-3 text-gray-500 font-medium">% bật hồ sơ công khai</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">Điểm tin cậy TB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companyRows.map((c) => (
                    <tr key={c.name} className="hover:bg-gray-50">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-300 shrink-0" />
                          <span className="font-semibold text-gray-800">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-600">{c.total}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-blue-700">{c.publicPct}%</td>
                      <td className="px-6 py-3.5 text-right text-gray-600">{c.avgScore ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
