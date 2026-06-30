import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SalaryHistoryClient from "./SalaryHistoryClient";

export const dynamic = "force-dynamic";

export default async function SalaryHistoryPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
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
