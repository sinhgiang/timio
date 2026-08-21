import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.penaltyRule.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      fromMinutes,
      toMinutes,
      amount,
      scopeDepartments,
      scopeEmployeeIds,
      scopeDaysOfWeek,
    }: {
      fromMinutes: number;
      toMinutes: number;
      amount: number;
      scopeDepartments?: string[];
      scopeEmployeeIds?: string[];
      scopeDaysOfWeek?: number[];
    } = await req.json();

    const existing = await prisma.penaltyRule.findFirst({ where: { id: params.id, companyId } });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy quy tắc" }, { status: 404 });

    const rule = await prisma.penaltyRule.update({
      where: { id: params.id },
      data: {
        fromMinutes,
        toMinutes,
        amount,
        scopeDepartments: scopeDepartments && scopeDepartments.length > 0 ? JSON.stringify(scopeDepartments) : null,
        scopeEmployeeIds: scopeEmployeeIds && scopeEmployeeIds.length > 0 ? JSON.stringify(scopeEmployeeIds) : null,
        scopeDaysOfWeek: scopeDaysOfWeek && scopeDaysOfWeek.length > 0 ? JSON.stringify(scopeDaysOfWeek) : null,
      },
    });
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
