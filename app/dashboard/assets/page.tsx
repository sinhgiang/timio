import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AssetsClient, { type AssetRow } from "./AssetsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tài sản bàn giao" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  let assets: AssetRow[] = [];
  try {
    const raw = await prisma.asset.findMany({
      where: { companyId: user.companyId },
      include: {
        employee: { select: { id: true, name: true, code: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    assets = JSON.parse(JSON.stringify(raw)) as AssetRow[];
  } catch {
    /* table not migrated yet — show empty state */
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, department: true },
  });

  return (
    <AssetsClient
      assets={assets}
      employees={JSON.parse(JSON.stringify(employees))}
    />
  );
}
