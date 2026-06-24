import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BranchesClient from "./BranchesClient";

export default async function BranchesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [company, branches] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { slug: true } }),
    prisma.branch.findMany({
      where: { companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <BranchesClient
      companyId={companyId}
      companySlug={company?.slug ?? ""}
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        gracePeriod: b.gracePeriod,
        workDays: b.workDays,
        employeeCount: b._count.employees,
        lat: b.lat,
        lng: b.lng,
        gpsRadius: b.gpsRadius,
        standardWorkDays: b.standardWorkDays ?? 26,
      }))}
    />
  );
}
