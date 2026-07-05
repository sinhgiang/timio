import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CommissionClient from "./CommissionClient";

export default async function CommissionPage() {
  const session = await getServerSession(authOptions);
  const sUser = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = sUser?.companyId;
  if (!companyId) return null;
  if (sUser?.role === "manager") redirect("/dashboard"); // quản lý không xem lương/hoa hồng

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
