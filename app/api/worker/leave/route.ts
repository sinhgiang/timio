import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  annual: "Nghỉ phép năm", sick: "Nghỉ ốm", unpaid: "Nghỉ không lương", maternity: "Nghỉ thai sản", other: "Khác",
};

// GET — số phép còn lại + lịch sử đơn nghỉ của chính chủ
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: { id: true, annualLeaveBalance: true, company: { select: { name: true } } },
  });
  const empIds = employees.map((e) => e.id);
  const nameByEmp = new Map(employees.map((e) => [e.id, e.company?.name ?? "Công ty"]));
  const leaveBalance = employees.reduce((s, e) => s + (e.annualLeaveBalance ?? 0), 0);
  if (!empIds.length) return NextResponse.json({ leaveBalance: 0, requests: [] });

  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: { in: empIds } },
    select: { id: true, employeeId: true, type: true, fromDate: true, toDate: true, days: true, reason: true, status: true, note: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    leaveBalance,
    requests: requests.map((r) => ({
      id: r.id, typeLabel: TYPE_LABEL[r.type] ?? r.type,
      fromDate: r.fromDate, toDate: r.toDate, days: r.days,
      reason: r.reason, status: r.status, note: r.note,
      companyName: nameByEmp.get(r.employeeId) ?? "Công ty",
    })),
  });
}
