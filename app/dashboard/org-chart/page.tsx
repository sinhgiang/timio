import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrgChartClient from "./OrgChartClient";
import { branchWhere } from "@/lib/branchScope";

interface EmployeeNode {
  id: string;
  name: string;
  code: string;
  department: string | null;
  position: string | null;
}

interface BranchNode {
  id: string;
  name: string;
  employees: EmployeeNode[];
}

export default async function OrgChartPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return null;

  const [company, branches, employees] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    prisma.branch.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { companyId, status: "active", ...branchWhere(user) },
      select: { id: true, name: true, code: true, department: true, position: true, branchId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const branchNodes: BranchNode[] = branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    employees: employees
      .filter((e) => e.branchId === branch.id)
      .map((e) => ({ id: e.id, name: e.name, code: e.code, department: e.department, position: e.position })),
  }));

  return (
    <OrgChartClient
      companyName={company?.name ?? "Công ty"}
      branches={branchNodes}
    />
  );
}
