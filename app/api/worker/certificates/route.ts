import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chứng chỉ & đào tạo của tôi
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { id: true } });
  if (emps.length === 0) return NextResponse.json({ items: [] });
  const items = await prisma.certificate.findMany({
    where: { employeeId: { in: emps.map((e) => e.id) } },
    select: { id: true, name: true, issuer: true, issueDate: true, expiryDate: true, note: true, company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items: items.map((c) => ({ ...c, companyName: c.company?.name ?? "" })) });
}
