import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AffiliateDashboardClient from "./AffiliateDashboardClient";

const PRO_PRICE = 299000;

function getTier(converted: number) {
  if (converted >= 21) return { name: "Vàng", icon: "🥇", rate: 20, next: null, nextAt: null };
  if (converted >= 6) return { name: "Bạc", icon: "🥈", rate: 15, next: "Vàng", nextAt: 21 };
  return { name: "Đồng", icon: "🥉", rate: 10, next: "Bạc", nextAt: 6 };
}

export default async function AffiliateDashboardPage({ params }: { params: { code: string } }) {
  const affiliate = await prisma.affiliate.findUnique({ where: { code: params.code } });
  if (!affiliate) return notFound();

  // Companies referred by this affiliate
  const referrals = await prisma.company.findMany({
    where: { affiliateCode: params.code },
    select: { id: true, name: true, slug: true, plan: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const converted = referrals.filter((r) => r.plan === "pro").length;
  const revenue = converted * PRO_PRICE;
  const tier = getTier(converted);
  const commission = Math.round(revenue * tier.rate / 100);
  const conversionRate = referrals.length > 0 ? Math.round(converted / referrals.length * 100) : 0;

  return (
    <AffiliateDashboardClient
      affiliate={{
        name: affiliate.name,
        email: affiliate.email,
        code: affiliate.code,
        phone: affiliate.phone,
        channel: affiliate.channel,
        createdAt: affiliate.createdAt.toISOString(),
      }}
      stats={{
        registered: referrals.length,
        converted,
        revenue,
        commission,
        conversionRate,
      }}
      tier={tier}
      referrals={referrals.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        plan: r.plan,
        createdAt: r.createdAt.toISOString(),
        isPro: r.plan === "pro",
      }))}
    />
  );
}
