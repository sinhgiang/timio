import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { status: string; note?: string };
    const { status, note } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const existing = await prisma.shiftSwapRequest.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu đổi ca" }, { status: 404 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Chỉ có thể duyệt/từ chối yêu cầu đang chờ" }, { status: 400 });
    }

    // If approved, swap the shift assignments
    if (status === "approved") {
      const [requesterShift, targetShift] = await Promise.all([
        prisma.shiftAssignment.findFirst({
          where: { employeeId: existing.requesterId, date: existing.requesterDate, companyId },
        }),
        prisma.shiftAssignment.findFirst({
          where: { employeeId: existing.targetId, date: existing.targetDate, companyId },
        }),
      ]);

      // Only swap if both shifts exist
      if (requesterShift && targetShift) {
        await prisma.$transaction([
          prisma.shiftAssignment.update({
            where: { id: requesterShift.id },
            data: {
              shiftLabel: targetShift.shiftLabel,
              checkIn: targetShift.checkIn,
              checkOut: targetShift.checkOut,
            },
          }),
          prisma.shiftAssignment.update({
            where: { id: targetShift.id },
            data: {
              shiftLabel: requesterShift.shiftLabel,
              checkIn: requesterShift.checkIn,
              checkOut: requesterShift.checkOut,
            },
          }),
        ]);
      }
      // If either shift doesn't exist, just update the status without erroring
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id: params.id },
      data: { status, note: note ?? null },
      include: {
        requester: { select: { id: true, name: true, code: true, department: true } },
        target: { select: { id: true, name: true, code: true, department: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/shift-swap-requests/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.shiftSwapRequest.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy yêu cầu đổi ca" }, { status: 404 });

    if (existing.status !== "pending") {
      return NextResponse.json({ error: "Chỉ có thể xóa yêu cầu đang chờ duyệt" }, { status: 400 });
    }

    await prisma.shiftSwapRequest.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/shift-swap-requests/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
