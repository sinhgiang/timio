import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ShiftSwapClient from "./ShiftSwapClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Đổi ca cho nhau" };

export default async function ShiftSwapPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const companyId = user.companyId;

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: { id: true, name: true, code: true, department: true },
    orderBy: { name: "asc" },
  });

  return <ShiftSwapClient employees={employees} />;
}
