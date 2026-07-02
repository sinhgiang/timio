import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code, pin, department, position, branchId, shiftOverride, baseSalary, joinDate, dateOfBirth, email, avatarUrl, phone, cccd, bankName, bankAccount, bankBranch, annualLeaveBalance, allowancesJson, dependents } =
      await req.json();

    if (!name || !code || !branchId || !companyId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // PIN stored as plain text (4-digit kiosk PIN, not a real password)
    const plainPin = pin && /^\d{4}$/.test(pin) ? pin : "0000";

    const employee = await prisma.employee.create({
      data: {
        name,
        code,
        pin: plainPin,
        department: department || null,
        position: position || null,
        branchId,
        companyId,
        shiftOverride: shiftOverride ? JSON.stringify(shiftOverride) : null,
        baseSalary: baseSalary ? Number(baseSalary) : 0,
        joinDate: joinDate ? new Date(joinDate) : null,
        dateOfBirth: dateOfBirth || null,
        email: email || null,
        avatarUrl: avatarUrl || null,
        phone: phone || null,
        cccd: cccd || null,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        bankBranch: bankBranch || null,
        annualLeaveBalance: annualLeaveBalance != null ? Number(annualLeaveBalance) : 12,
        allowancesJson: allowancesJson ? JSON.stringify(allowancesJson) : null,
        dependents: dependents != null ? Number(dependents) : 0,
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
