import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SalaryHistoryClient from "./SalaryHistoryClient";
import { branchWhere } from "@/lib/branchScope";

export const dynamic = "force-dynamic";

export default async function SalaryHistoryPage() {
  const session = await getServerSession(authOptions);
  const sUser = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = sUser?.companyId;
  if (!companyId) redirect("/login");
  if (sUser?.role === "manager") redirect("/dashboard"); // quản lý không xem lương

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active", ...branchWhere(sUser) },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  return (
    <SalaryHistoryClient
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code ?? null,
      }))}
    />
  );
}
