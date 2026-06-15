import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AffiliateDashboardClient from "./AffiliateDashboardClient";

export const dynamic = "force-dynamic";

const PLAN_PRICES: Record<string, number> = { pro: 299000, business: 799000 };
function planPrice(plan: string) { return PLAN_PRICES[plan] ?? 0; }

function getTier(converted: number) {
  if (converted >= 21) return { name: "Vàng", icon: "🥇", rate: 20, next: null, nextAt: null };
  if (converted >= 6)  return { name: "Bạc",  icon: "🥈", rate: 15, next: "Vàng", nextAt: 21 };
  return                      { name: "Đồng", icon: "🥉", rate: 10, next: "Bạc",  nextAt: 6  };
}

function detectSource(referrer: string | null): string {
  if (!referrer) return "Trực tiếp";
  if (/google\./i.test(referrer))           return "Google";
  if (/facebook\.com|fb\.com/i.test(referrer)) return "Facebook";
  if (/youtube\.com|youtu\.be/i.test(referrer)) return "YouTube";
  if (/tiktok\.com/i.test(referrer))        return "TikTok";
  if (/zalo\.me|zalo\.vn/i.test(referrer)) return "Zalo";
  if (/twitter\.com|t\.co/i.test(referrer)) return "Twitter/X";
  if (/linkedin\.com/i.test(referrer))      return "LinkedIn";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "Khác";
  }
}

const COMMISSION_WINDOW_MS = 180 * 24 * 60 * 60 * 1000; // 6 tháng = 180 ngày

export default async function AffiliateDashboardPage({ params }: { params: { code: string } }) {
  const affiliate = await prisma.affiliate.findUnique({ where: { code: params.code } });
  if (!affiliate) return notFound();

  // Companies referred by this affiliate
  const referrals = await prisma.company.findMany({
    where: { affiliateCode: params.code },
    select: { id: true, name: true, slug: true, plan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // All click records for this affiliate
  const allClicks = await prisma.affiliateClick.findMany({
    where: { affiliateCode: params.code },
    select: { id: true, ip: true, device: true, referrer: true, convertedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // First completed payment date for each referred company
  const companyIds = referrals.map((r) => r.id);
  const firstPayments = companyIds.length > 0
    ? await prisma.payment.findMany({
        where: { companyId: { in: companyIds }, status: "completed" },
        select: { companyId: true, paidAt: true },
        orderBy: { paidAt: "asc" },
      })
    : [];
  const firstPaidMap = new Map<string, Date>();
  for (const p of firstPayments) {
    if (p.paidAt && !firstPaidMap.has(p.companyId)) {
      firstPaidMap.set(p.companyId, p.paidAt);
    }
  }

  // ---- Stats ----
  const now = new Date();
  // paidReferrals: chỉ đếm những công ty còn trong cửa sổ hoa hồng 6 tháng
  const paidReferrals = referrals.filter((r) => {
    if (r.plan !== "pro" && r.plan !== "business") return false;
    const fp = firstPaidMap.get(r.id);
    if (!fp) return false;
    return (now.getTime() - fp.getTime()) < COMMISSION_WINDOW_MS;
  });
  const converted  = paidReferrals.length;
  const revenue    = paidReferrals.reduce((s, r) => s + planPrice(r.plan), 0);
  const tier       = getTier(converted);
  const commission = Math.round(revenue * tier.rate / 100);
  const conversionRate = referrals.length > 0 ? Math.round(converted / referrals.length * 100) : 0;

  // ---- Click analytics ----
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29);

  const totalClicks  = allClicks.length;
  const todayClicks  = allClicks.filter((c) => c.createdAt >= todayStart).length;
  const monthClicks  = allClicks.filter((c) => c.createdAt >= monthStart).length;
  const uniqueIps    = new Set(allClicks.map((c) => c.ip).filter(Boolean)).size;
  const clickConverted = allClicks.filter((c) => c.convertedAt != null).length;
  const clickToRegRate = totalClicks > 0 ? Math.round(clickConverted / totalClicks * 100) : 0;
  const regToProRate   = clickConverted > 0 ? Math.round(converted / clickConverted * 100) : 0;

  // Device breakdown
  const deviceMap = new Map<string, number>();
  for (const c of allClicks) {
    const d = c.device ?? "unknown";
    deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1);
  }
  const devices = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // Traffic source breakdown
  const sourceMap = new Map<string, number>();
  for (const c of allClicks) {
    const s = detectSource(c.referrer);
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Daily clicks — last 30 days
  const dailyMap = new Map<string, { clicks: number; conversions: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    dailyMap.set(d.toISOString().slice(0, 10), { clicks: 0, conversions: 0 });
  }
  for (const c of allClicks) {
    if (c.createdAt < thirtyDaysAgo) continue;
    const key = c.createdAt.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.clicks++;
      if (c.convertedAt) entry.conversions++;
    }
  }
  const dailyLast30 = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));

  return (
    <AffiliateDashboardClient
      affiliate={{
        name:      affiliate.name,
        email:     affiliate.email,
        code:      affiliate.code,
        phone:     affiliate.phone,
        channel:   affiliate.channel,
        createdAt: affiliate.createdAt.toISOString(),
      }}
      stats={{
        registered:     referrals.length,
        converted,
        revenue,
        commission,
        conversionRate,
      }}
      tier={tier}
      referrals={referrals.map((r) => {
        const fp = firstPaidMap.get(r.id) ?? null;
        const commissionUntil = fp ? new Date(fp.getTime() + COMMISSION_WINDOW_MS) : null;
        const inWindow = !!fp && (now.getTime() - fp.getTime()) < COMMISSION_WINDOW_MS;
        return {
          id:              r.id,
          name:            r.name,
          slug:            r.slug,
          plan:            r.plan,
          createdAt:       r.createdAt.toISOString(),
          isPaid:          r.plan === "pro" || r.plan === "business",
          planPrice:       planPrice(r.plan),
          inWindow,
          commissionUntil: commissionUntil ? commissionUntil.toISOString() : null,
        };
      })}
      clickStats={{
        total:          totalClicks,
        uniqueIps,
        today:          todayClicks,
        thisMonth:      monthClicks,
        clickConverted,
        clickToRegRate,
        regToProRate,
        devices,
        sources,
        dailyLast30,
      }}
    />
  );
}
