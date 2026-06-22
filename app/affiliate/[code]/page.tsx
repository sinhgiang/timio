import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AffiliateDashboardClient from "./AffiliateDashboardClient";

export const dynamic = "force-dynamic";

const PLAN_PRICES: Record<string, number> = { pro: 299000, business: 799000 };
function planPrice(plan: string) { return PLAN_PRICES[plan] ?? 0; }

const COMMISSION_WINDOW_MS = 180 * 24 * 60 * 60 * 1000; // 6 tháng
const HOLD_MS = 30 * 24 * 60 * 60 * 1000;               // 30 ngày giữ đơn

// Ngày thanh toán = ngày 15 của tháng đó nếu eligibleDate < 15, ngược lại tháng sau
function getPayoutDate(eligibleDate: Date): Date {
  const d15Same = new Date(eligibleDate.getFullYear(), eligibleDate.getMonth(), 15);
  if (d15Same > eligibleDate) return d15Same;
  return new Date(eligibleDate.getFullYear(), eligibleDate.getMonth() + 1, 15);
}

function getTier(converted: number) {
  if (converted >= 21) return { name: "Vàng", icon: "🥇", rate: 20, next: null, nextAt: null };
  if (converted >= 6)  return { name: "Bạc",  icon: "🥈", rate: 15, next: "Vàng", nextAt: 21 };
  return                      { name: "Đồng", icon: "🥉", rate: 10, next: "Bạc",  nextAt: 6  };
}

function detectSource(referrer: string | null): string {
  if (!referrer) return "Trực tiếp";

  // UTM-encoded source (set by AffiliateTracker when UTM params present)
  // Format: "utm:source/medium/campaign"
  if (referrer.startsWith("utm:")) {
    const parts  = referrer.slice(4).split("/");
    const src    = (parts[0] || "").toLowerCase();
    const medium = (parts[1] || "").toLowerCase();
    if (src === "google"    && medium === "cpc")   return "Google Ads";
    if (src === "google")                          return "Google";
    if (src === "facebook"  && medium === "paid")  return "Facebook Ads";
    if (src === "facebook"  || src === "fb")       return "Facebook";
    if (src === "instagram" && medium === "paid")  return "Instagram Ads";
    if (src === "instagram")                       return "Instagram";
    if (src === "tiktok"    && medium === "paid")  return "TikTok Ads";
    if (src === "tiktok")                          return "TikTok";
    if (src === "zalo")                            return "Zalo";
    if (src === "youtube")                         return "YouTube";
    if (src === "linkedin")                        return "LinkedIn";
    if (src === "twitter"   || src === "x")        return "Twitter/X";
    if (src === "email"     || src === "newsletter") return "Email";
    // Capitalize unknown UTM source
    return src.charAt(0).toUpperCase() + src.slice(1);
  }

  // Fallback: parse HTTP referrer
  if (/google\./i.test(referrer))               return "Google";
  if (/facebook\.com|fb\.com/i.test(referrer))  return "Facebook";
  if (/youtube\.com|youtu\.be/i.test(referrer)) return "YouTube";
  if (/tiktok\.com/i.test(referrer))            return "TikTok";
  if (/zalo\.me|zalo\.vn/i.test(referrer))      return "Zalo";
  if (/twitter\.com|t\.co/i.test(referrer))     return "Twitter/X";
  if (/linkedin\.com/i.test(referrer))          return "LinkedIn";
  if (/instagram\.com/i.test(referrer))         return "Instagram";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Khác";
  }
}

export default async function AffiliateDashboardPage({ params }: { params: { code: string } }) {
  let affiliate = await prisma.affiliate.findUnique({ where: { code: params.code } });

  // Nếu dùng code cũ → redirect về URL mới (affiliate đã đổi slug)
  if (!affiliate) {
    const history = await prisma.affiliateCodeHistory.findUnique({
      where: { oldCode: params.code },
      include: { affiliate: true },
    });
    if (history) redirect(`/affiliate/${history.affiliate.code}`);
    return notFound();
  }

  const [referrals, allClicks] = await Promise.all([
    prisma.company.findMany({
      where: { affiliateCode: params.code },
      select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.affiliateClick.findMany({
      where: { affiliateCode: params.code },
      select: { id: true, ip: true, device: true, referrer: true, convertedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // First completed payment date per referred company
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

  const now = new Date();

  // Phân loại từng công ty đã trả phí
  const paidEligible: typeof referrals = [];   // qua 30 ngày & trong 6 tháng → tính commission
  const paidPending: typeof referrals = [];    // chưa qua 30 ngày → đang giữ đơn

  for (const r of referrals) {
    if (r.plan !== "pro" && r.plan !== "business") continue;
    const fp = firstPaidMap.get(r.id);
    if (!fp) continue;
    const age = now.getTime() - fp.getTime();
    const inWindow = age < COMMISSION_WINDOW_MS;
    const isEligible = age >= HOLD_MS;
    if (!inWindow) continue; // ngoài 6 tháng
    if (isEligible) paidEligible.push(r);
    else paidPending.push(r);
  }

  const converted        = paidEligible.length;
  const revenue          = paidEligible.reduce((s, r) => s + planPrice(r.plan), 0);
  const tier             = getTier(converted);
  const commission       = Math.round(revenue * tier.rate / 100);
  const pendingRevenue   = paidPending.reduce((s, r) => s + planPrice(r.plan), 0);
  const pendingCommission = Math.round(pendingRevenue * tier.rate / 100);
  const conversionRate   = referrals.length > 0 ? Math.round(converted / referrals.length * 100) : 0;

  // Ngày thanh toán tiếp theo từ hôm nay
  const nextPayout = getPayoutDate(now);

  // ---- Click analytics ----
  const todayStart    = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 29);

  const totalClicks    = allClicks.length;
  const todayClicks    = allClicks.filter((c) => c.createdAt >= todayStart).length;
  const monthClicks    = allClicks.filter((c) => c.createdAt >= monthStart).length;
  const uniqueIps      = new Set(allClicks.map((c) => c.ip).filter(Boolean)).size;
  const clickConverted = allClicks.filter((c) => c.convertedAt != null).length;
  const clickToRegRate = totalClicks > 0 ? Math.round(clickConverted / totalClicks * 100) : 0;
  const regToProRate   = clickConverted > 0 ? Math.round(converted / clickConverted * 100) : 0;

  const deviceMap = new Map<string, number>();
  for (const c of allClicks) {
    const d = c.device ?? "unknown";
    deviceMap.set(d, (deviceMap.get(d) ?? 0) + 1);
  }
  const devices = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  const sourceMap = new Map<string, number>();
  for (const c of allClicks) {
    const s = detectSource(c.referrer);
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1);
  }
  const sources = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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
        registered:       referrals.length,
        converted,
        revenue,
        commission,
        pendingCommission,
        conversionRate,
        nextPayoutDate:   nextPayout.toISOString(),
      }}
      tier={tier}
      referrals={referrals.map((r) => {
        const fp = firstPaidMap.get(r.id) ?? null;
        const commissionUntil = fp ? new Date(fp.getTime() + COMMISSION_WINDOW_MS) : null;
        const holdEndsAt      = fp ? new Date(fp.getTime() + HOLD_MS) : null;
        const payoutDate      = holdEndsAt ? getPayoutDate(holdEndsAt) : null;
        const age             = fp ? now.getTime() - fp.getTime() : -1;
        const inWindow        = age >= 0 && age < COMMISSION_WINDOW_MS;
        const isEligible      = age >= HOLD_MS;
        return {
          id:              r.id,
          name:            r.name,
          slug:            r.slug,
          plan:            r.plan,
          createdAt:       r.createdAt.toISOString(),
          isPaid:          r.plan === "pro" || r.plan === "business",
          planPrice:       planPrice(r.plan),
          inWindow,
          isEligible,
          commissionUntil: commissionUntil ? commissionUntil.toISOString() : null,
          holdEndsAt:      holdEndsAt ? holdEndsAt.toISOString() : null,
          payoutDate:      payoutDate ? payoutDate.toISOString() : null,
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
