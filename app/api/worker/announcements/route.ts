import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bảng tin công ty — tin của (các) công ty tôi đang/đã làm, còn hiệu lực
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { companyId: true } });
  const companyIds = Array.from(new Set(emps.map((e) => e.companyId)));
  if (companyIds.length === 0) return NextResponse.json({ items: [] });
  const now = new Date();
  const items = await prisma.announcement.findMany({
    where: { companyId: { in: companyIds }, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    select: { id: true, title: true, content: true, type: true, pinned: true, publishedAt: true, company: { select: { name: true } } },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 30,
  });
  return NextResponse.json({ items: items.map((a) => ({ id: a.id, title: a.title, content: a.content, type: a.type, pinned: a.pinned, publishedAt: a.publishedAt.toISOString(), companyName: a.company?.name ?? "" })) });
}
