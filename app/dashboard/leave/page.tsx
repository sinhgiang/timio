import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeaveClient from "./LeaveClient";

export default async function LeavePage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [company, requests] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, signatureUrl: true, stampUrl: true },
    }),
    prisma.leaveRequest.findMany({
      where: { companyId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            annualLeaveBalance: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <LeaveClient
      company={{
        name: company?.name ?? "",
        slug: company?.slug ?? "",
        signatureUrl: company?.signatureUrl ?? null,
        stampUrl: company?.stampUrl ?? null,
      }}
      requests={requests.map((r) => ({
        id: r.id,
        type: r.type as "annual" | "sick" | "unpaid" | "maternity" | "other",
        fromDate: r.fromDate,
        toDate: r.toDate,
        days: r.days,
        reason: r.reason,
        status: r.status as "pending" | "approved" | "rejected",
        note: r.note,
        createdAt: r.createdAt.toISOString(),
        employee: {
          id: r.employee.id,
          name: r.employee.name,
          code: r.employee.code,
          department: r.employee.department,
          annualLeaveBalance: r.employee.annualLeaveBalance,
          branch: { name: r.employee.branch.name },
        },
      }))}
    />
  );
}
