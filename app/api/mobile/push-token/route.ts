import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPin } from "@/lib/mobileEmployeeAuth";

// Lưu Expo push token của 1 nhân viên (xác thực bằng employeeId + pin).
export async function POST(req: NextRequest) {
  try {
    const { employeeId, pin, token } = await req.json();
    if (!employeeId || !pin || !token) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, status: "active" },
      select: { id: true, pin: true },
    });
    if (!employee || !(await checkPin(employee.pin, pin))) {
      return NextResponse.json({ error: "Sai mã PIN" }, { status: 401 });
    }
    await prisma.employee.update({ where: { id: employee.id }, data: { pushToken: String(token) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
