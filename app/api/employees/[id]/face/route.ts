import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, companyId },
    select: { faceDescriptors: true },
  });
  return NextResponse.json({ hasFace: !!employee?.faceDescriptors });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { descriptors } = await req.json() as { descriptors: number[][] };

    if (!Array.isArray(descriptors) || descriptors.length === 0) {
      return NextResponse.json({ error: "Thiếu dữ liệu khuôn mặt" }, { status: 400 });
    }

    await prisma.employee.update({
      where: { id: params.id, companyId },
      data: { faceDescriptors: JSON.stringify(descriptors) },
    });

    return NextResponse.json({ ok: true, count: descriptors.length });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.employee.update({
    where: { id: params.id, companyId },
    data: { faceDescriptors: null },
  });
  return NextResponse.json({ ok: true });
}
