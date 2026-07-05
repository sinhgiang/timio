import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CorrectionsClient from "./CorrectionsClient";
import { branchWhere } from "@/lib/branchScope";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Điều chỉnh chấm công" };

export default async function CorrectionsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const [corrections, employees] = await Promise.all([
    prisma.correctionRequest.findMany({
      where: { employee: { companyId: user.companyId, ...branchWhere(user) } },
      include: { employee: { select: { name: true, code: true, department: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    prisma.employee.findMany({
      where: { companyId: user.companyId, status: "active", ...branchWhere(user) },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <CorrectionsClient initialData={JSON.parse(JSON.stringify(corrections))} employees={employees} />;
}
