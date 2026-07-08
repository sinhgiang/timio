import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — lịch sử chấm công gần đây của chính chủ (tất cả nơi làm)
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: { id: true, company: { select: { name: true } } },
  });
  const empIds = employees.map((e) => e.id);
  const nameByEmp = new Map(employees.map((e) => [e.id, e.company?.name ?? "Công ty"]));
  if (!empIds.length) return NextResponse.json({ logs: [], summary: { total: 0, onTime: 0, late: 0 } });

  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: { in: empIds }, checkInAt: { not: null } },
    select: { employeeId: true, date: true, checkInAt: true, checkOutAt: true, minutesLate: true, status: true },
    orderBy: { date: "desc" },
    take: 40,
  });

  const [total, onTime] = await Promise.all([
    prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null } } }),
    prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 } }),
  ]);

  return NextResponse.json({
    summary: { total, onTime, late: total - onTime },
    logs: logs.map((l) => ({
      date: l.date,
      checkInAt: l.checkInAt ? l.checkInAt.toISOString() : null,
      checkOutAt: l.checkOutAt ? l.checkOutAt.toISOString() : null,
      minutesLate: l.minutesLate,
      companyName: nameByEmp.get(l.employeeId) ?? "Công ty",
    })),
  });
}
