import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to   = searchParams.get("to");   // YYYY-MM-DD
  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  try {
    const shifts = await prisma.shiftAssignment.findMany({
      where: {
        companyId: user.companyId,
        date: { gte: from, lte: to },
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      select: {
        id: true, employeeId: true, date: true,
        shiftLabel: true, checkIn: true, checkOut: true, note: true,
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }],
    });
    return NextResponse.json(shifts);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date, shiftLabel, checkIn, checkOut, note } = await req.json();
  if (!employeeId || !date || !shiftLabel || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: user.companyId } });
  if (!emp) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

  try {
    const shift = await prisma.shiftAssignment.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { shiftLabel, checkIn, checkOut, note: note || null },
      create: {
        companyId: user.companyId,
        employeeId,
        date,
        shiftLabel,
        checkIn,
        checkOut,
        note: note || null,
      },
    });
    return NextResponse.json(shift, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server — vui lòng chạy SQL migration" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date } = await req.json();
  if (!employeeId || !date) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

  try {
    await prisma.shiftAssignment.delete({
      where: { employeeId_date: { employeeId, date } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
}
