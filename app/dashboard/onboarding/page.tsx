import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true, name: true, code: true, department: true, status: true },
    orderBy: { name: "asc" },
  });

  return <OnboardingClient employees={employees} />;
}
