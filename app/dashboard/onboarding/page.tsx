import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";
import { branchWhere } from "@/lib/branchScope";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return null;

  const [company, employees] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { slug: true } }),
    prisma.employee.findMany({
      where: { companyId, ...branchWhere(user) },
      select: { id: true, name: true, code: true, department: true, status: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <OnboardingClient employees={employees} companySlug={company?.slug ?? ""} />;
}
