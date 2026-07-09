import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lịch ca của tôi — từ 7 ngày trước tới 30 ngày tới, mọi công ty.
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { id: true } });
  if (emps.length === 0) return NextResponse.json({ shifts: [] });
  const empIds = emps.map((e) => e.id);

  const today = new Date();
  const from = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const to = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const shifts = await prisma.shiftAssignment.findMany({
    where: { employeeId: { in: empIds }, date: { gte: from, lte: to } },
    select: { date: true, shiftLabel: true, checkIn: true, checkOut: true, company: { select: { name: true } } },
    orderBy: { date: "asc" },
    take: 100,
  });
  return NextResponse.json({ shifts: shifts.map((s) => ({ date: s.date, shiftLabel: s.shiftLabel, checkIn: s.checkIn, checkOut: s.checkOut, companyName: s.company?.name ?? "" })) });
}
