import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const existing = await prisma.salaryAdvance.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (!(await employeeInScope(user, existing.employeeId)))
    return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  const updated = await prisma.salaryAdvance.update({
    where: { id: params.id },
    data: {
      status,
      approvedAt: status === "approved" ? new Date() : null,
    },
    include: {
      employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.salaryAdvance.findFirst({
    where: { id: params.id, companyId: user.companyId },
    select: { employeeId: true },
  });
  if (existing && !(await employeeInScope(user, existing.employeeId)))
    return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  await prisma.salaryAdvance.deleteMany({
    where: { id: params.id, companyId: user.companyId },
  });

  return NextResponse.json({ ok: true });
}
