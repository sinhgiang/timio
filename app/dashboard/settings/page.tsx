import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const currentYear = new Date().getFullYear();
  const [company, penaltyRules, rewardRules, holidays, branches] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.penaltyRule.findMany({ where: { companyId }, orderBy: { fromMinutes: "asc" } }),
    prisma.rewardRule.findMany({ where: { companyId } }),
    prisma.holiday.findMany({
      where: { companyId, date: { gte: `${currentYear}-01-01`, lte: `${currentYear}-12-31` } },
      orderBy: { date: "asc" },
    }),
    prisma.branch.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const slug = company?.slug ?? "";
  const referredCompanies = slug
    ? await prisma.company.findMany({
        where: { referredBy: slug },
        select: { name: true, slug: true, plan: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const referralRegistered = referredCompanies.length;
  const referralConverted = referredCompanies.filter((c) => c.plan === "pro" || c.plan === "business").length;

  return (
    <SettingsClient
      company={{
        id: companyId,
        name: company?.name ?? "",
        slug: company?.slug ?? "",
        telegramBotToken: company?.telegramBotToken ?? "",
        accountingChatId: company?.accountingChatId ?? null,
        signatureUrl: company?.signatureUrl ?? null,
        stampUrl: company?.stampUrl ?? null,
        zaloOaToken: company?.zaloOaToken ?? null,
        kioskMessages: company?.kioskMessages ?? null,
        paydayOfMonth: (company as { paydayOfMonth?: number })?.paydayOfMonth ?? 5,
      }}
      penaltyRules={penaltyRules}
      rewardRules={rewardRules}
      holidays={holidays}
      branches={branches}
      referralStats={{ registered: referralRegistered, converted: referralConverted, companies: referredCompanies.map((c) => ({ name: c.name, slug: c.slug, plan: c.plan, joinedAt: c.createdAt.toISOString() })) }}
    />
  );
}
