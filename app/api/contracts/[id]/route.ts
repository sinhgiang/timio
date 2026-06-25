import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/contracts/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, startDate, endDate, note, fileUrl, fileName } = await req.json();

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, employee: { companyId } },
  });
  if (!contract) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const updated = await prisma.contract.update({
    where: { id: params.id },
    data: {
      type: type ?? contract.type,
      startDate: startDate ?? contract.startDate,
      endDate: endDate !== undefined ? (endDate || null) : contract.endDate,
      note: note !== undefined ? (note || null) : contract.note,
      fileUrl: fileUrl !== undefined ? (fileUrl || null) : contract.fileUrl,
      fileName: fileName !== undefined ? (fileName || null) : contract.fileName,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/contracts/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, employee: { companyId } },
  });
  if (!contract) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await prisma.contract.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
