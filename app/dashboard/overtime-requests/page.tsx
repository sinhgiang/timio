import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OvertimeRequestsClient from "./OvertimeRequestsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Duyệt tăng ca" };

export default async function OvertimeRequestsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const companyId = user.companyId;
  const scopedBranchId = user?.role === "manager" && user?.branchId ? user.branchId : null;

  const requests = await prisma.overtimeRequest.findMany({
    where: {
      companyId,
      ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          code: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = requests.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    hours: r.hours,
    reason: r.reason,
    status: r.status as "pending" | "approved" | "rejected",
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    employee: {
      id: r.employee.id,
      name: r.employee.name,
      code: r.employee.code,
      department: r.employee.department,
    },
  }));

  return <OvertimeRequestsClient initialRequests={data} />;
}
