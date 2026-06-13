import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code, pin, department, position, branchId, shiftOverride, baseSalary, joinDate, dateOfBirth, phone, cccd } =
      await req.json();

    if (!name || !code || !branchId || !companyId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // PIN is optional (face auth is primary); default to "0000" if not provided
    const rawPin = pin && /^\d{4}$/.test(pin) ? pin : "0000";
    const hashedPin = await bcrypt.hash(rawPin, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        code,
        pin: hashedPin,
        department: department || null,
        position: position || null,
        branchId,
        companyId,
        shiftOverride: shiftOverride ? JSON.stringify(shiftOverride) : null,
        baseSalary: baseSalary ? Number(baseSalary) : 0,
        joinDate: joinDate ? new Date(joinDate) : null,
        dateOfBirth: dateOfBirth || null,
        phone: phone || null,
        cccd: cccd || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "Mã nhân viên đã tồn tại" }, { status: 409 });
    }
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
