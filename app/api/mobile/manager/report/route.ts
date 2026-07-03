import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";

export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

    const summaries = await prisma.monthlySummary.findMany({
      where: {
        year,
        month,
        employee: { companyId: auth.companyId, status: "active" },
      },
      include: {
        employee: { select: { name: true, department: true, position: true } },
      },
      orderBy: { employee: { name: "asc" } },
    });

    const employees = await prisma.employee.findMany({
      where: { companyId: auth.companyId, status: "active" },
      select: { id: true, name: true, department: true, position: true },
      orderBy: { name: "asc" },
    });

    const summaryMap = new Map(summaries.map((s) => [s.employeeId, s]));

    const records = employees.map((emp) => {
      const s = summaryMap.get(emp.id);
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department ?? "",
        position: emp.position ?? "",
        daysPresent: s?.daysPresent ?? 0,
        daysLate: s?.daysLate ?? 0,
        daysAbsent: s?.daysAbsent ?? 0,
        totalMinutesLate: s?.totalMinutesLate ?? 0,
        totalPenalty: s?.totalPenalty ?? 0,
      };
    });

    const totals = {
      daysPresent: records.reduce((a, r) => a + r.daysPresent, 0),
      daysLate: records.reduce((a, r) => a + r.daysLate, 0),
      daysAbsent: records.reduce((a, r) => a + r.daysAbsent, 0),
    };

    return NextResponse.json({ year, month, records, totals });
  } catch (err) {
    console.error("[mobile/manager/report]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
