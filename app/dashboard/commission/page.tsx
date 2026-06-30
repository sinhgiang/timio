import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CommissionClient from "./CommissionClient";

export default async function CommissionPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: {
      id: true,
      name: true,
      code: true,
      department: true,
      salaryType: true,
      commissionRate: true,
      kpiTarget: true,
      kpiBonus: true,
      baseSalary: true,
    },
    orderBy: { name: "asc" },
  });

  return <CommissionClient employees={employees} />;
}
