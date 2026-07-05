import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  // Quản lý CN + kế toán CN đều bị giới hạn chi nhánh; nhưng chỉ QUẢN LÝ mới bị ẩn lương
  const mgrBranch = scopedBranchId(auth);
  const hideSalary = auth.role === "manager";

  try {
    const employees = await prisma.employee.findMany({
      where: {
        companyId: auth.companyId,
        status: "active",
        ...(mgrBranch ? { branchId: mgrBranch } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        department: true,
        position: true,
        status: true,
        phone: true,
        email: true,
        joinDate: true,
        baseSalary: true,
        annualLeaveBalance: true,
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        department: e.department ?? "",
        position: e.position ?? "",
        status: e.status,
        phone: e.phone ?? "",
        email: e.email ?? "",
        joinDate: e.joinDate ? e.joinDate.toISOString().slice(0, 10) : null,
        // Chỉ QUẢN LÝ bị ẩn lương; kế toán (kể cả kế toán chi nhánh) vẫn xem được
        ...(hideSalary ? {} : { baseSalary: e.baseSalary ?? 0 }),
        annualLeaveBalance: e.annualLeaveBalance,
        branchName: e.branch.name,
      }))
    );
  } catch (err) {
    console.error("[mobile/manager/employees]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
