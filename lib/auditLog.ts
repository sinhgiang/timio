import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  companyId: string;
  adminId?: string;
  adminEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        adminId: params.adminId ?? null,
        adminEmail: params.adminEmail ?? null,
        action: params.action,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        detail: params.detail ? JSON.stringify(params.detail) : null,
      },
    });
  } catch {
    // Fire-and-forget — never throw
  }
}
