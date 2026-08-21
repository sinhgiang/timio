import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      fromMinutes,
      toMinutes,
      amount,
      type,
      scopeDepartments,
      scopeEmployeeIds,
      scopeDaysOfWeek,
    }: {
      fromMinutes: number;
      toMinutes: number;
      amount: number;
      type?: string;
      scopeDepartments?: string[];
      scopeEmployeeIds?: string[];
      scopeDaysOfWeek?: number[];
    } = await req.json();

    const rule = await prisma.penaltyRule.create({
      data: {
        fromMinutes,
        toMinutes,
        amount,
        companyId,
        type: type ?? "late",
        scopeDepartments: scopeDepartments && scopeDepartments.length > 0 ? JSON.stringify(scopeDepartments) : null,
        scopeEmployeeIds: scopeEmployeeIds && scopeEmployeeIds.length > 0 ? JSON.stringify(scopeEmployeeIds) : null,
        scopeDaysOfWeek: scopeDaysOfWeek && scopeDaysOfWeek.length > 0 ? JSON.stringify(scopeDaysOfWeek) : null,
      },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
