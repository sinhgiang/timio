import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { employeeId, phone, email } = await req.json();
    if (!employeeId) return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
      },
      select: { id: true, phone: true, email: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
