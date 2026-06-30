import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ShiftCalendarClient from "./ShiftCalendarClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lịch phân ca" };
export const dynamic = "force-dynamic";

// Returns the Monday of the current week
function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

interface Props {
  searchParams?: { week?: string };
}

export default async function ShiftsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const weekStart = searchParams?.week ?? getMondayOfWeek(new Date());
  const weekEnd   = addDays(weekStart, 6);
  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const employees = await prisma.employee.findMany({
    where: {
      companyId: user.companyId,
      status: "active",
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
    },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, code: true, department: true },
  });

  let shifts: { id: string; employeeId: string; date: string; shiftLabel: string; checkIn: string; checkOut: string; note: string | null }[] = [];
  try {
    shifts = await prisma.shiftAssignment.findMany({
      where: {
        companyId: user.companyId,
        date: { gte: weekStart, lte: weekEnd },
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      select: {
        id: true, employeeId: true, date: true,
        shiftLabel: true, checkIn: true, checkOut: true, note: true,
      },
      orderBy: [{ date: "asc" }],
    });
  } catch { /* table not migrated yet */ }

  return (
    <ShiftCalendarClient
      employees={JSON.parse(JSON.stringify(employees))}
      initialShifts={JSON.parse(JSON.stringify(shifts))}
      weekStart={weekStart}
    />
  );
}
