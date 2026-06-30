import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SalaryAdvancesClient from "./SalaryAdvancesClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tạm ứng lương" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams?: { month?: string };
}

export default async function SalaryAdvancesPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams?.month ?? defaultMonth;
  const [yearStr, monStr] = monthStr.split("-");
  const year  = parseInt(yearStr);
  const month = parseInt(monStr);

  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const [advances, employees] = await Promise.all([
    prisma.salaryAdvance.findMany({
      where: {
        companyId: user.companyId, year, month,
        employee: scopedBranchId ? { branchId: scopedBranchId } : undefined,
      },
      include: {
        employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        status: "active",
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } },
    }),
  ]);

  return (
    <SalaryAdvancesClient
      advances={JSON.parse(JSON.stringify(advances))}
      employees={JSON.parse(JSON.stringify(employees))}
      currentMonth={monthStr}
    />
  );
}
