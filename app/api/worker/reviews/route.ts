import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Đánh giá của tôi (performance review) — chỉ hiện bản đã có điểm/đã xong
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { id: true } });
  if (emps.length === 0) return NextResponse.json({ items: [] });
  const items = await prisma.performanceReview.findMany({
    where: { employeeId: { in: emps.map((e) => e.id) }, status: { in: ["manager-review", "done"] } },
    select: { id: true, period: true, type: true, overallScore: true, selfScore: true, strengths: true, improvements: true, goals: true, status: true, company: { select: { name: true } } },
    orderBy: { period: "desc" },
    take: 30,
  });
  return NextResponse.json({ items: items.map((r) => ({ ...r, companyName: r.company?.name ?? "" })) });
}
