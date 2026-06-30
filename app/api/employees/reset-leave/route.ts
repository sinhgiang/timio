import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/employees/reset-leave — cấp lại phép năm mới cho toàn bộ hoặc 1 nhân viên
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, days } = await req.json();
  const entitlement = typeof days === "number" && days > 0 ? days : 12;

  if (employeeId) {
    // Reset cho 1 nhân viên
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: user.companyId } });
    if (!emp) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    await prisma.employee.update({ where: { id: employeeId }, data: { annualLeaveBalance: entitlement } });
    return NextResponse.json({ updated: 1 });
  } else {
    // Reset cho toàn bộ nhân viên active
    const result = await prisma.employee.updateMany({
      where: { companyId: user.companyId, status: "active" },
      data: { annualLeaveBalance: entitlement },
    });
    return NextResponse.json({ updated: result.count });
  }
}
