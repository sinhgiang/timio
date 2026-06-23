import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminReferralsClient from "./AdminReferralsClient";

const PLAN_PRICES: Record<string, number> = { pro: 299000, business: 799000 };
function planRevenue(plan: string) { return PLAN_PRICES[plan] ?? 0; }
function isPaid(plan: string) { return plan === "pro" || plan === "business"; }

const COMMISSION_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // 12 tháng

function getTier(converted: number) {
  if (converted >= 21) return { name: "Vàng", icon: "🥇", rate: 20 };
  if (converted >= 6) return { name: "Bạc", icon: "🥈", rate: 15 };
  return { name: "Đồng", icon: "🥉", rate: 10 };
}

export default async function AdminReferralsPage() {
  const [affiliates, companies] = await Promise.all([
    prisma.affiliate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.company.findMany({
      select: { id: true, name: true, slug: true, plan: true, referredBy: true, affiliateCode: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // First payment date per company (for 6-month commission window)
  const paidCompanyIds = companies.filter((c) => isPaid(c.plan)).map((c) => c.id);
  const firstPayments = paidCompanyIds.length > 0
    ? await prisma.payment.findMany({
        where: { companyId: { in: paidCompanyIds }, status: "completed" },
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
  const adminNow = new Date();
  function inWindow(companyId: string): boolean {
    const fp = firstPaidMap.get(companyId);
    if (!fp) return false;
    return (adminNow.getTime() - fp.getTime()) < COMMISSION_WINDOW_MS;
  }

  // === AFFILIATES ===
  const affiliateStats = affiliates.map((a) => {
    const referred = companies.filter((c) => c.affiliateCode === a.code);
    const paidReferrals = referred.filter((c) => isPaid(c.plan) && inWindow(c.id));
    const converted = paidReferrals.length;
    const revenue = paidReferrals.reduce((s, c) => s + planRevenue(c.plan), 0);
    const tier = getTier(converted);
    const commission = Math.round(revenue * tier.rate / 100);
    const planBreakdown = {
      starter:  referred.filter((c) => c.plan === "starter").length,
      pro:      referred.filter((c) => c.plan === "pro").length,
      business: referred.filter((c) => c.plan === "business").length,
    };
    const referredCompanies = referred.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, plan: c.plan,
      createdAt: c.createdAt.toISOString(),
    }));
    return { ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), referred: referred.length, converted, revenue, commission, tier, planBreakdown, referredCompanies };
  }).sort((a, b) => b.converted - a.converted);

  const totalAffCommission = affiliateStats.reduce((s, a) => s + a.commission, 0);
  const totalAffConverted = affiliateStats.reduce((s, a) => s + a.converted, 0);
  const totalAffRevenue = affiliateStats.reduce((s, a) => s + a.revenue, 0);

  // === REFERRALS (company-to-company) ===
  const referralMap = new Map<string, typeof companies>();
  for (const c of companies) {
    if (c.referredBy) {
      const list = referralMap.get(c.referredBy) ?? [];
      list.push(c);
      referralMap.set(c.referredBy, list);
    }
  }

  const referrers = companies
    .filter((c) => referralMap.has(c.slug))
    .map((c) => {
      const referred = referralMap.get(c.slug) ?? [];
      const paidReferrals = referred.filter((r) => isPaid(r.plan) && inWindow(r.id));
      const converted = paidReferrals.length;
      const revenue = paidReferrals.reduce((s, r) => s + planRevenue(r.plan), 0);
      const tier = getTier(converted);
      const commission = Math.round(revenue * tier.rate / 100);
      return {
        id: c.id, name: c.name, slug: c.slug, plan: c.plan,
        createdAt: c.createdAt.toISOString(),
        referred: referred.map((r) => ({ id: r.id, name: r.name, plan: r.plan, createdAt: r.createdAt.toISOString() })),
        converted, revenue, commission, tier,
      };
    })
    .sort((a, b) => b.converted - a.converted);

  const totalRefConverted = referrers.reduce((s, r) => s + r.converted, 0);
  const totalRefRevenue = referrers.reduce((s, r) => s + r.revenue, 0);
  const totalRefReferrals = companies.filter((c) => c.referredBy).length;

  return (
    <AdminReferralsClient
      affiliates={affiliateStats}
      affiliateSummary={{ total: affiliates.length, converted: totalAffConverted, revenue: totalAffRevenue, commission: totalAffCommission }}
      referrers={referrers}
      referralSummary={{ total: totalRefReferrals, converted: totalRefConverted, revenue: totalRefRevenue }}
    />
  );
}
