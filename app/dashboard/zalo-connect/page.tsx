import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ZaloConnectClient from "./ZaloConnectClient";

export const dynamic = "force-dynamic";

export default async function ZaloConnectPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) redirect("/login");
  if (user.role !== "owner") redirect("/dashboard");

  const [company, employees] = await Promise.all([
    prisma.company.findUnique({
      where: { id: user.companyId },
      select: { plan: true, zaloOaId: true, zaloOaToken: true, zaloRefreshToken: true },
    }),
    prisma.employee.findMany({
      where: { companyId: user.companyId, status: "active" },
      select: { id: true, name: true, code: true, zaloUserId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const connected = !!(company?.zaloOaToken || company?.zaloRefreshToken);
  const plan = company?.plan ?? "starter";

  return (
    <ZaloConnectClient
      connected={connected}
      plan={plan}
      oaId={company?.zaloOaId ?? null}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        zaloUserId: e.zaloUserId,
      }))}
    />
  );
}
