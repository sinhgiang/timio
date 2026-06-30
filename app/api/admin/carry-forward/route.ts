import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CARRY = 12; // Vietnam law: max 12 days carry-forward

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Only owner can run year-end carry-forward
    if (user?.role && user.role !== "owner") {
      return NextResponse.json({ error: "Chỉ chủ tài khoản mới được thực hiện chuyển phép năm" }, { status: 403 });
    }

    const body = await req.json();
    const { year } = body as { year?: number };
    if (!year || typeof year !== "number") {
      return NextResponse.json({ error: "Thiếu năm cần chuyển phép" }, { status: 400 });
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: { id: true, name: true, annualLeaveBalance: true },
    });

    let totalCarriedForward = 0;
    let processed = 0;

    await Promise.all(
      employees.map(async (emp) => {
        const carry = Math.min(emp.annualLeaveBalance, MAX_CARRY);
        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            leaveCarryForward: carry,
            annualLeaveBalance: 12, // new year allotment
          },
        });
        totalCarriedForward += carry;
        processed++;
      })
    );

    return NextResponse.json({ processed, totalCarriedForward, year });
  } catch (error) {
    console.error("Carry-forward error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
