import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { confirmedByEmployeeId } = await req.json();

    const request = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      select: { id: true, handoverEmployeeId: true, handoverConfirmedAt: true },
    });

    if (!request) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
    if (request.handoverConfirmedAt) return NextResponse.json({ error: "Đã xác nhận rồi" }, { status: 409 });
    if (request.handoverEmployeeId && request.handoverEmployeeId !== confirmedByEmployeeId) {
      return NextResponse.json({ error: "Không đúng người nhận việc" }, { status: 403 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { handoverConfirmedAt: new Date() },
    });

    return NextResponse.json({ ok: true, handoverConfirmedAt: updated.handoverConfirmedAt });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: {
      employee: {
        select: { id: true, name: true, code: true, department: true, position: true, dateOfBirth: true },
      },
    },
  });

  if (!request) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  let handoverEmployee = null;
  if (request.handoverEmployeeId) {
    handoverEmployee = await prisma.employee.findUnique({
      where: { id: request.handoverEmployeeId },
      select: { id: true, name: true, code: true, faceDescriptors: true },
    });
  }

  return NextResponse.json({ request, handoverEmployee });
}
