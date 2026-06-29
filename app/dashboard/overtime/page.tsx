import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OvertimeClient from "./OvertimeClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Duyệt tăng ca" };

export default async function OvertimePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const logs = await prisma.attendanceLog.findMany({
    where: {
      minutesOvertime: { gt: 0 },
      overtimeStatus: { in: ["pending", "approved", "rejected"] },
      employee: {
        companyId: user.companyId,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
    },
    select: {
      id: true,
      date: true,
      checkInAt: true,
      checkOutAt: true,
      minutesOvertime: true,
      overtimeAmount: true,
      overtimeStatus: true,
      employee: {
        select: {
          id: true,
          name: true,
          code: true,
          department: true,
          branch: { select: { name: true } },
        },
      },
    },
    orderBy: [{ date: "desc" }],
  });

  return <OvertimeClient logs={JSON.parse(JSON.stringify(logs))} />;
}
