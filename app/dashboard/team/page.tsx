import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PLAN_SUBUSER_LIMITS } from "@/lib/permissions";
import TeamClient from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; email?: string } | undefined;
  if (!user?.companyId) redirect("/login");

  const [members, company, branches] = await Promise.all([
    prisma.admin.findMany({
      where: { companyId: user.companyId },
      select: { id: true, name: true, email: true, role: true, branchId: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true, createdAt: true,
        branch: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findUnique({ where: { id: user.companyId }, select: { plan: true, zaloOaToken: true } }),
    prisma.branch.findMany({ where: { companyId: user.companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const plan = company?.plan ?? "starter";
  const subUserLimit = PLAN_SUBUSER_LIMITS[plan] ?? 0;

  return (
    <TeamClient
      initialMembers={members}
      currentUserEmail={user.email ?? ""}
      currentRole={user.role ?? "owner"}
      plan={plan}
      subUserLimit={subUserLimit}
      zaloConfigured={!!company?.zaloOaToken}
      branches={branches}
    />
  );
}
