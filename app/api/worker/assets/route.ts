import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tài sản công ty đang giao cho tôi
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { id: true } });
  if (emps.length === 0) return NextResponse.json({ items: [] });
  const items = await prisma.asset.findMany({
    where: { employeeId: { in: emps.map((e) => e.id) }, returnedAt: null },
    select: { id: true, code: true, name: true, category: true, assignedAt: true, status: true, note: true, company: { select: { name: true } } },
    orderBy: { assignedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items: items.map((a) => ({ id: a.id, code: a.code, name: a.name, category: a.category, status: a.status, note: a.note, assignedAt: a.assignedAt ? a.assignedAt.toISOString() : null, companyName: a.company?.name ?? "" })) });
}
