import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const existing = await prisma.salaryAdvance.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

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
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.salaryAdvance.deleteMany({
    where: { id: params.id, companyId: user.companyId },
  });

  return NextResponse.json({ ok: true });
}
