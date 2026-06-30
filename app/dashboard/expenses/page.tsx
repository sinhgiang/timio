import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: { id: true, name: true, code: true, department: true },
    orderBy: { name: "asc" },
  });

  return <ExpensesClient employees={employees} />;
}
