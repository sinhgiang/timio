import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, notes, hiredEmpId } = await req.json();

  const updated = await prisma.candidate.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(hiredEmpId !== undefined && { hiredEmpId: hiredEmpId || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.candidate.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
