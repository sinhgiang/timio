import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const currentYear = new Date().getFullYear();
  const [company, penaltyRules, rewardRules, holidays] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.penaltyRule.findMany({ where: { companyId }, orderBy: { fromMinutes: "asc" } }),
    prisma.rewardRule.findMany({ where: { companyId } }),
    prisma.holiday.findMany({
      where: { companyId, date: { gte: `${currentYear}-01-01`, lte: `${currentYear}-12-31` } },
      orderBy: { date: "asc" },
    }),
  ]);

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
      }}
      penaltyRules={penaltyRules}
      rewardRules={rewardRules}
      holidays={holidays}
    />
  );
}
