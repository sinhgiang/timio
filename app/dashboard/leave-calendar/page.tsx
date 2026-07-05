import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeaveCalendarClient from "./LeaveCalendarClient";
import { employeeBranchWhere } from "@/lib/branchScope";

export default async function LeaveCalendarPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      status: { in: ["approved", "pending"] },
      fromDate: { lte: toDate },
      toDate: { gte: fromDate },
      ...employeeBranchWhere(user),
    },
    include: {
      employee: { select: { name: true, department: true } },
    },
    orderBy: { fromDate: "asc" },
  });

  const leaveData = leaves.map((l) => ({
    id: l.id,
    employeeName: l.employee.name,
    department: l.employee.department ?? "",
    type: l.type as "annual" | "sick" | "unpaid" | "maternity" | "other",
    fromDate: l.fromDate,
    toDate: l.toDate,
    days: l.days,
    status: l.status as "pending" | "approved",
  }));

  return (
    <LeaveCalendarClient
      initialLeaves={leaveData}
      initialYear={year}
      initialMonth={month}
      companyId={companyId}
    />
  );
}
