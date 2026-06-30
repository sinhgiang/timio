import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { slug, code, pin } = await req.json();
    if (!slug || !code || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin đăng nhập" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { companyId: company.id, code: code.toUpperCase(), status: "active" },
      select: {
        id: true, name: true, code: true, pin: true,
        department: true, position: true, phone: true, email: true,
        baseSalary: true, annualLeaveBalance: true, joinDate: true,
        branch: { select: { name: true } },
      },
    });

    if (!employee || !employee.pin || employee.pin !== pin) {
      return NextResponse.json({ error: "Mã NV hoặc PIN không đúng" }, { status: 401 });
    }

    // Trả về thông tin nhân viên (không trả PIN)
    return NextResponse.json({
      employeeId: employee.id,
      name: employee.name,
      code: employee.code,
      companyId: company.id,
      companyName: company.name,
      department: employee.department ?? "",
      position: employee.position ?? "",
      branch: employee.branch.name,
      phone: employee.phone ?? "",
      email: employee.email ?? "",
      baseSalary: employee.baseSalary ?? 0,
      annualLeaveBalance: employee.annualLeaveBalance,
      joinDate: employee.joinDate?.toISOString().split("T")[0] ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
