import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CertificatesClient from "./CertificatesClient";
import { branchWhere, employeeBranchWhere } from "@/lib/branchScope";

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return null;

  const [certificates, employees] = await Promise.all([
    prisma.certificate.findMany({
      where: { companyId, ...employeeBranchWhere(user) },
      include: { employee: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { companyId, status: "active", ...branchWhere(user) },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <CertificatesClient
      certificates={certificates.map((c) => ({
        id: c.id,
        employeeId: c.employeeId,
        employeeName: c.employee.name,
        employeeCode: c.employee.code ?? "",
        name: c.name,
        issuer: c.issuer ?? null,
        issueDate: c.issueDate ?? null,
        expiryDate: c.expiryDate ?? null,
        note: c.note ?? null,
        createdAt: c.createdAt.toISOString(),
      }))}
      employees={employees}
    />
  );
}
