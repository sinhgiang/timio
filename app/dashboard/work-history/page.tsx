import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WorkHistoryClient from "./WorkHistoryClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lịch sử công tác" };
export const dynamic = "force-dynamic";

export default async function WorkHistoryPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, department: true },
  });

  return (
    <WorkHistoryClient
      employees={JSON.parse(JSON.stringify(employees))}
    />
  );
}
