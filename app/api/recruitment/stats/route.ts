import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const candWhere = b ? { companyId, job: { OR: [{ branchId: b }, { branchId: null }] } } : { companyId };
  const jobWhere = b ? { companyId, OR: [{ branchId: b }, { branchId: null }] } : { companyId };

  const [candidates, jobs] = await Promise.all([
    prisma.candidate.findMany({
      where: candWhere,
      select: { status: true, appliedAt: true, hiredAt: true, aiScore: true, jobId: true, interviewAt: true, source: true },
    }),
    prisma.jobPosting.findMany({
      where: jobWhere,
      select: { id: true, title: true, status: true },
    }),
  ]);

  // Phễu theo trạng thái
  const funnel: Record<string, number> = { new: 0, reviewing: 0, interview: 0, offer: 0, hired: 0, rejected: 0 };
  for (const c of candidates) if (funnel[c.status] !== undefined) funnel[c.status]++;

  const total = candidates.length;
  const hired = funnel.hired;
  const interviewed = candidates.filter((c) => ["interview", "offer", "hired"].includes(c.status)).length;

  // Tỷ lệ chuyển đổi
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const conversions = {
    applyToInterview: pct(interviewed, total),
    interviewToHire: pct(hired, interviewed),
    applyToHire: pct(hired, total),
  };

  // Thời gian tuyển trung bình (ngày) — từ nộp đến hired
  const hiredWithDates = candidates.filter((c) => c.status === "hired" && c.hiredAt);
  const avgDaysToHire = hiredWithDates.length
    ? Math.round(
        hiredWithDates.reduce((s, c) => s + (c.hiredAt!.getTime() - c.appliedAt.getTime()) / 86400000, 0) /
          hiredWithDates.length
      )
    : null;

  // Đơn theo thời gian
  const now = Date.now();
  const day = 86400000;
  const startOfTodayVN = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }) + "T00:00:00+07:00").getTime();
  const applied = {
    today: candidates.filter((c) => c.appliedAt.getTime() >= startOfTodayVN).length,
    week: candidates.filter((c) => now - c.appliedAt.getTime() <= 7 * day).length,
    month: candidates.filter((c) => now - c.appliedAt.getTime() <= 30 * day).length,
  };

  // Điểm AI trung bình
  const scored = candidates.filter((c) => typeof c.aiScore === "number");
  const avgAiScore = scored.length
    ? Math.round(scored.reduce((s, c) => s + (c.aiScore as number), 0) / scored.length)
    : null;

  // Theo vị trí
  const perJob = jobs.map((j) => {
    const cs = candidates.filter((c) => c.jobId === j.id);
    return {
      title: j.title,
      status: j.status,
      total: cs.length,
      hired: cs.filter((c) => c.status === "hired").length,
      interview: cs.filter((c) => ["interview", "offer"].includes(c.status)).length,
      new: cs.filter((c) => c.status === "new").length,
    };
  }).sort((a, z) => z.total - a.total);

  // Phỏng vấn sắp tới
  const upcomingInterviews = candidates.filter((c) => c.interviewAt && c.interviewAt.getTime() >= now - day).length;

  // KH5 — Nguồn ứng viên (source of hire): tổng + đã tuyển + tỷ lệ chốt theo nguồn
  const srcMap = new Map<string, { total: number; hired: number }>();
  for (const c of candidates) {
    const key = c.source || "other";
    const cur = srcMap.get(key) ?? { total: 0, hired: 0 };
    cur.total++;
    if (c.status === "hired") cur.hired++;
    srcMap.set(key, cur);
  }
  const bySource = Array.from(srcMap.entries())
    .map(([source, v]) => ({ source, total: v.total, hired: v.hired, hireRate: pct(v.hired, v.total) }))
    .sort((a, z) => z.total - a.total);

  // KH5 — Insight (quy tắc, không cần AI)
  const insights: string[] = [];
  const bestByHire = [...bySource].filter((s) => s.total >= 3).sort((a, z) => z.hired - a.hired || z.hireRate - a.hireRate)[0];
  const SRC_VI: Record<string, string> = { website: "Trang tuyển dụng", referral: "Giới thiệu", linkedin: "LinkedIn", facebook: "Facebook", other: "Nguồn khác" };
  if (bestByHire && bestByHire.hired > 0) {
    insights.push(`Nguồn "${SRC_VI[bestByHire.source] ?? bestByHire.source}" hiệu quả nhất — chốt ${bestByHire.hired} người (${bestByHire.hireRate}%). Nên đẩy mạnh nguồn này.`);
  }
  if (conversions.applyToHire > 0 && conversions.applyToHire < 10 && total >= 10) {
    insights.push(`Tỷ lệ chốt chỉ ${conversions.applyToHire}% — cân nhắc siết tiêu chí sàng lọc hoặc cải thiện tin tuyển dụng.`);
  }
  const slowJobs = perJob.filter((j) => j.status === "open" && j.total >= 3 && j.hired === 0);
  if (slowJobs.length > 0) {
    insights.push(`${slowJobs.length} vị trí có ứng viên nhưng chưa tuyển được ai (VD "${slowJobs[0].title}") — cân nhắc tăng lương hoặc mở thêm kênh.`);
  }

  return NextResponse.json({
    total,
    openJobs: jobs.filter((j) => j.status === "open").length,
    funnel,
    conversions,
    avgDaysToHire,
    applied,
    avgAiScore,
    perJob,
    upcomingInterviews,
    bySource,
    insights,
  });
}
