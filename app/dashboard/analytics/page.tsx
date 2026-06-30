import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) redirect("/login");

  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "active" },
    select: { id: true, name: true, code: true, department: true },
    orderBy: { name: "asc" },
  });

  return <AnalyticsClient employees={employees} />;
}
