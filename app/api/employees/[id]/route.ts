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

    const { name, code, pin, department, position, branchId, status, shiftOverride, baseSalary, joinDate, dateOfBirth, email, avatarUrl, phone, cccd, bankName, bankAccount, bankBranch } =
      await req.json();

    // Only include fields that were actually sent — undefined = skip (Prisma ignores undefined in updates)
    const data: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(branchId !== undefined && { branchId }),
      ...(status !== undefined && { status }),
      ...(department !== undefined && { department: department || null }),
      ...(position !== undefined && { position: position || null }),
      ...(shiftOverride !== undefined && { shiftOverride: shiftOverride ? JSON.stringify(shiftOverride) : null }),
      ...(baseSalary !== undefined && { baseSalary: Number(baseSalary) }),
      ...(joinDate !== undefined && { joinDate: joinDate ? new Date(joinDate) : null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth || null }),
      ...(email !== undefined && { email: email || null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(cccd !== undefined && { cccd: cccd || null }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount || null }),
      ...(bankBranch !== undefined && { bankBranch: bankBranch || null }),
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
