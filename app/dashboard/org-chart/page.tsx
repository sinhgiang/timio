import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OrgChartClient from "./OrgChartClient";
import { branchWhere } from "@/lib/branchScope";

interface EmployeeNode {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string | null;
}

interface DepartmentNode {
  name: string;
  employees: EmployeeNode[];
}

interface BranchNode {
  id: string;
  name: string;
  departments: DepartmentNode[];
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

  // Group by branch → department
  const branchNodes: BranchNode[] = branches.map((branch) => {
    const branchEmps = employees.filter((e) => e.branchId === branch.id);

    // Group by department within this branch
    const deptMap = new Map<string, EmployeeNode[]>();
    for (const emp of branchEmps) {
      const dept = emp.department ?? "(Chưa phân bổ)";
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push({
        id: emp.id,
        name: emp.name,
        code: emp.code,
        department: emp.department ?? "(Chưa phân bổ)",
        position: emp.position,
      });
    }

    const departments: DepartmentNode[] = Array.from(deptMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, emps]) => ({ name, employees: emps }));

    return { id: branch.id, name: branch.name, departments };
  });

  return (
    <OrgChartClient
      companyName={company?.name ?? "Công ty"}
      branches={branchNodes}
    />
  );
}
