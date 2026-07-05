import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const mgrBranch = scopedBranchId(auth);

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ||
      new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });

    const employees = await prisma.employee.findMany({
      where: {
        companyId: auth.companyId,
        status: "active",
        ...(mgrBranch ? { branchId: mgrBranch } : {}),
      },
      select: {
        id: true,
        name: true,
        department: true,
        position: true,
        logs: {
          where: { date },
          select: {
            checkInAt: true,
            checkOutAt: true,
            status: true,
            minutesLate: true,
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    const records = employees.map((emp) => {
      const log = emp.logs[0] ?? null;
      const fmt = (d: Date | null) =>
        d
          ? d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })
          : null;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department ?? "",
        position: emp.position ?? "",
        checkInAt: log?.checkInAt?.toISOString() ?? null,
        checkOutAt: log?.checkOutAt?.toISOString() ?? null,
        checkInTime: fmt(log?.checkInAt ?? null),
        checkOutTime: fmt(log?.checkOutAt ?? null),
        status: log?.status ?? "absent",
        minutesLate: log?.minutesLate ?? 0,
      };
    });

    return NextResponse.json(records);
  } catch (err) {
    console.error("[mobile/manager/attendance]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
