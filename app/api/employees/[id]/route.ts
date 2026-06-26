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
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code, pin, department, position, branchId, status, shiftOverride, baseSalary, joinDate, dateOfBirth, email, phone, cccd, bankName, bankAccount, bankBranch } =
      await req.json();

    const data: Record<string, unknown> = {
      name,
      code,
      department: department || null,
      position: position || null,
      branchId,
      status,
      shiftOverride: shiftOverride ? JSON.stringify(shiftOverride) : null,
      baseSalary: baseSalary !== undefined ? Number(baseSalary) : 0,
      joinDate: joinDate ? new Date(joinDate) : null,
      dateOfBirth: dateOfBirth || null,
      email: email || null,
      phone: phone || null,
      cccd: cccd || null,
      bankName: bankName !== undefined ? (bankName || null) : undefined,
      bankAccount: bankAccount !== undefined ? (bankAccount || null) : undefined,
      bankBranch: bankBranch !== undefined ? (bankBranch || null) : undefined,
    };

    if (pin && /^\d{4}$/.test(pin)) {
      data.pin = pin;
    }

    const employee = await prisma.employee.update({
      where: { id: params.id, companyId },
      data,
    });

    return NextResponse.json(employee);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.employee.delete({ where: { id: params.id, companyId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
