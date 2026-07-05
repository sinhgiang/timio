import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managerBranchId } from "@/lib/branchScope";
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; email?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const mgrBranch = managerBranchId(user);

    const { name, code, pin, department, position, branchId, status, shiftOverride, baseSalary, salaryReason, joinDate, dateOfBirth, email, avatarUrl, phone, zalo, facebook, cccd, bankName, bankAccount, bankBranch, annualLeaveBalance, allowancesJson, salaryType, commissionRate, kpiTarget, kpiBonus } =
      await req.json();

    // Fetch current employee to detect salary change
    const currentEmployee = await prisma.employee.findUnique({
      where: { id: params.id, companyId },
      select: { baseSalary: true, companyId: true, branchId: true },
    });
    if (!currentEmployee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    // Quản lý chi nhánh: chỉ sửa được nhân viên chi nhánh mình
    if (mgrBranch && currentEmployee.branchId !== mgrBranch) {
      return NextResponse.json({ error: "Bạn chỉ được sửa nhân viên thuộc chi nhánh mình." }, { status: 403 });
    }

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
      ...(zalo !== undefined && { zalo: zalo || null }),
      ...(facebook !== undefined && { facebook: facebook || null }),
      ...(cccd !== undefined && { cccd: cccd || null }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount || null }),
      ...(bankBranch !== undefined && { bankBranch: bankBranch || null }),
      ...(annualLeaveBalance !== undefined && { annualLeaveBalance: Number(annualLeaveBalance) }),
      ...(allowancesJson !== undefined && { allowancesJson: allowancesJson ? JSON.stringify(allowancesJson) : null }),
      ...(salaryType !== undefined && { salaryType }),
      ...(commissionRate !== undefined && { commissionRate: commissionRate != null ? Number(commissionRate) : null }),
      ...(kpiTarget !== undefined && { kpiTarget: kpiTarget != null ? Number(kpiTarget) : null }),
      ...(kpiBonus !== undefined && { kpiBonus: kpiBonus != null ? Number(kpiBonus) : null }),
    };

    if (pin && /^\d{4}$/.test(pin)) {
      data.pin = pin;
    }

    // Quản lý KHÔNG được sửa lương/ngân hàng và KHÔNG được chuyển nhân viên sang chi nhánh khác
    if (mgrBranch) {
      for (const k of ["baseSalary", "salaryType", "commissionRate", "kpiTarget", "kpiBonus", "allowancesJson", "bankName", "bankAccount", "bankBranch", "branchId"]) {
        delete data[k];
      }
    }

    const employee = await prisma.employee.update({
      where: { id: params.id, companyId },
      data,
    });

    // Log salary history if baseSalary changed (không áp dụng cho quản lý — họ không sửa lương)
    if (!mgrBranch && baseSalary !== undefined && Number(baseSalary) !== (currentEmployee.baseSalary ?? 0)) {
      await prisma.salaryHistory.create({
        data: {
          companyId,
          employeeId: params.id,
          date: new Date().toISOString().slice(0, 10),
          oldSalary: currentEmployee.baseSalary ?? 0,
          newSalary: Number(baseSalary),
          reason: salaryReason ?? null,
          adminEmail: user.email ?? null,
        },
      });
    }

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
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const mgrBranch = managerBranchId(user);
    if (mgrBranch) {
      const emp = await prisma.employee.findFirst({ where: { id: params.id, companyId, branchId: mgrBranch }, select: { id: true } });
      if (!emp) return NextResponse.json({ error: "Bạn chỉ được xóa nhân viên thuộc chi nhánh mình." }, { status: 403 });
    }

    await prisma.employee.delete({ where: { id: params.id, companyId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
