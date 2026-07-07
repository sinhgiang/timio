import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "EmployeeChecklist" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3);`
  );
  console.log("OK: EmployeeChecklist.confirmedAt added");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
