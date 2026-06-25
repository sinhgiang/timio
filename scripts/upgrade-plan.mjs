import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const admin = await prisma.admin.findUnique({
  where: { email: "sinhgiang2020@gmail.com" },
  select: { companyId: true, email: true },
});

if (!admin) {
  console.log("Không tìm thấy admin với email này");
  await prisma.$disconnect();
  process.exit(1);
}

console.log("CompanyId:", admin.companyId);

const expiry = new Date("2030-12-31");
const company = await prisma.company.update({
  where: { id: admin.companyId },
  data: { plan: "business", planExpires: expiry },
  select: { id: true, name: true, slug: true, plan: true, planExpires: true },
});

console.log("Done:", JSON.stringify(company, null, 2));
await prisma.$disconnect();
