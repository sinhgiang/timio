import { prisma } from "@/lib/prisma";

export interface TalentDevStats {
  vDevScore: number | null;      // điểm phát triển 0-100
  vDevTrend: "up" | "flat" | "down" | null;
  vPromotions: number;           // số lần thăng chức / đổi chức danh
  vReviewCount: number;          // số kỳ đánh giá
  avgReview: number | null;      // điểm đánh giá trung bình (1-5)
  disciplines: number;           // số lần kỷ luật
  enough: boolean;
  timeline: { period: string; score: number }[]; // lộ trình phát triển (điểm 0-100 theo kỳ)
}

/**
 * Điểm PHÁT TRIỂN từ PerformanceReview (xu hướng điểm) + WorkHistory (thăng chức) − DisciplineRecord.
 * Đây là chiều thứ 2 bên cạnh chấm công.
 */
export async function computeTalentDevStats(employeeId: string): Promise<TalentDevStats> {
  const [reviews, workHistory, disciplineRows] = await Promise.all([
    prisma.performanceReview.findMany({
      where: { employeeId },
      select: { period: true, overallScore: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workHistory.findMany({
      where: { employeeId, type: { in: ["promotion", "title_change"] } },
      select: { id: true },
    }),
    prisma.disciplineRecord.findMany({ where: { employeeId }, select: { id: true } }),
  ]);

  const scored = reviews.filter((r) => typeof r.overallScore === "number");
  const vReviewCount = scored.length;
  const vPromotions = workHistory.length;
  const disciplines = disciplineRows.length;

  const enough = vReviewCount >= 1 || vPromotions >= 1;

  const avgReview = vReviewCount > 0
    ? Number((scored.reduce((s, r) => s + (r.overallScore as number), 0) / vReviewCount).toFixed(2))
    : null;

  // Xu hướng: so nửa đầu vs nửa sau chuỗi điểm
  let vDevTrend: "up" | "flat" | "down" | null = null;
  if (vReviewCount >= 2) {
    const half = Math.floor(vReviewCount / 2);
    const firstAvg = scored.slice(0, half).reduce((s, r) => s + (r.overallScore as number), 0) / Math.max(1, half);
    const secondAvg = scored.slice(vReviewCount - half).reduce((s, r) => s + (r.overallScore as number), 0) / Math.max(1, half);
    const diff = secondAvg - firstAvg;
    vDevTrend = diff > 0.25 ? "up" : diff < -0.25 ? "down" : "flat";
  } else if (vReviewCount === 1 && vPromotions >= 1) {
    vDevTrend = "up";
  } else if (vReviewCount === 1) {
    vDevTrend = "flat";
  }

  let vDevScore: number | null = null;
  if (enough) {
    // Nền từ điểm đánh giá (1-5 → 0-100); nếu chưa có review, dùng 60 làm nền khi có thăng chức
    const base = avgReview != null ? (avgReview / 5) * 100 : 60;
    let s = base + Math.min(15, vPromotions * 5) - Math.min(30, disciplines * 10);
    if (vDevTrend === "up") s += 5;
    else if (vDevTrend === "down") s -= 5;
    vDevScore = Math.max(0, Math.min(100, Math.round(s)));
  }

  const timeline = scored.map((r) => ({ period: r.period, score: Math.round(((r.overallScore as number) / 5) * 100) }));

  return { vDevScore, vDevTrend, vPromotions, vReviewCount, avgReview, disciplines, enough, timeline };
}
