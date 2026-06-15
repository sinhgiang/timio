import { prisma } from "@/lib/prisma";
import CompaniesClient from "./CompaniesClient";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  let companies;
  try {
    companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, plan: true, planExpires: true, createdAt: true,
        _count: { select: { employees: true, admins: true } },
        admins: { select: { email: true }, take: 1 },
        payments: { where: { status: "completed" }, select: { amount: true } },
      },
    });
  } catch (err) {
    console.error("[AdminCompanies] Prisma error:", err);
    throw err;
  }

  const rows = companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    plan: c.plan,
    planExpires: c.planExpires?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    employeeCount: c._count.employees,
    adminEmail: c.admins[0]?.email ?? "",
    totalRevenue: c.payments.reduce((s, p) => s + p.amount, 0),
  }));

  const totalEmployees = rows.reduce((s, r) => s + r.employeeCount, 0);
  const proCount = rows.filter((r) => r.plan === "pro" || r.plan === "business").length;
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <CompaniesClient
      companies={rows}
      summary={{ total: rows.length, pro: proCount, employees: totalEmployees, revenue: totalRevenue }}
    />
  );
}
