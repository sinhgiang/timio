import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculate13thMonth } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const minDays = parseInt(searchParams.get("minDays") ?? "15");

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      department: true,
      baseSalary: true,
      joinDate: true,
      summaries: {
        where: { year },
        select: { month: true, year: true, daysPresent: true },
      },
    },
  });

  const result = employees.map((emp) => {
    const th13 = calculate13thMonth({
      baseSalary: emp.baseSalary ?? 0,
      joinDate: emp.joinDate,
      year,
      monthlySummaries: emp.summaries,
      minDaysThreshold: minDays,
    });
    return {
      id: emp.id,
      name: emp.name,
      code: emp.code,
      department: emp.department,
      baseSalary: emp.baseSalary ?? 0,
      joinDate: emp.joinDate ? emp.joinDate.toISOString().split("T")[0] : null,
      eligibleMonths: th13.eligibleMonths,
      amount: th13.amount,
      breakdown: th13.breakdown,
    };
  });

  return NextResponse.json(result);
}
