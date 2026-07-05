import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claim = await prisma.expenseClaim.findFirst({ where: { id: params.id, companyId }, select: { employeeId: true } });
  if (!claim) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!(await employeeInScope(user, claim.employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  const { status, note, title, category, amount, date, description } = await req.json();

  await prisma.expenseClaim.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note: note || null }),
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(date !== undefined && { date }),
      ...(description !== undefined && { description: description || null }),
      ...(status === "approved" || status === "rejected" ? { approvedBy: user?.email || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claim = await prisma.expenseClaim.findFirst({ where: { id: params.id, companyId }, select: { employeeId: true } });
  if (!claim) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!(await employeeInScope(user, claim.employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  await prisma.expenseClaim.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
