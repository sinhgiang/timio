import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DisciplineClient from "./DisciplineClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kỷ luật lao động" };

export default async function DisciplinePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const companyId = user.companyId;
  const scopedBranchId = user?.role === "manager" && user?.branchId ? user.branchId : null;

  const [records, employees] = await Promise.all([
    prisma.disciplineRecord.findMany({
      where: {
        companyId,
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      include: {
        employee: {
          select: { id: true, name: true, code: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: {
        companyId,
        status: "active",
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      select: { id: true, name: true, code: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const data = records.map((r) => ({
    id: r.id,
    type: r.type as "warning" | "serious_warning" | "suspension" | "dismissal",
    date: r.date,
    reason: r.reason,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    employee: {
      id: r.employee.id,
      name: r.employee.name,
      code: r.employee.code,
      department: r.employee.department,
    },
  }));

  return <DisciplineClient initialRecords={data} employees={employees} />;
}
