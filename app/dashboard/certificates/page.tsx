import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CertificatesClient from "./CertificatesClient";

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [certificates, employees] = await Promise.all([
    prisma.certificate.findMany({
      where: { companyId },
      include: { employee: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { companyId, status: "active" },
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
