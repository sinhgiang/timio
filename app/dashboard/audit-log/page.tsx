import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AuditLogClient from "./AuditLogClient";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: { action?: string };
}) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const actionFilter = searchParams?.action ?? "";

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId,
      ...(actionFilter ? { action: actionFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      adminEmail: true,
      action: true,
      entityType: true,
      entityId: true,
      detail: true,
      createdAt: true,
    },
  });

  // Get distinct action types for filter
  const allActions = await prisma.auditLog.findMany({
    where: { companyId },
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });

  const rows = logs.map((l) => ({
    id: l.id,
    adminEmail: l.adminEmail ?? "",
    action: l.action,
    entityType: l.entityType ?? "",
    entityId: l.entityId ?? "",
    detail: l.detail ?? "",
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <AuditLogClient
      rows={rows}
      actionTypes={allActions.map((a) => a.action)}
      currentAction={actionFilter}
    />
  );
}
