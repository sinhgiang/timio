import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CustomReportClient from "./CustomReportClient";

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

export default async function CustomReportPage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const employees: EmployeeOption[] = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: { id: true, name: true, code: true, department: true },
    orderBy: { name: "asc" },
  });

  return <CustomReportClient employees={employees} />;
}
