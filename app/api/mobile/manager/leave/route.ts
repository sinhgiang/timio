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
    const status = searchParams.get("status") ?? "pending";

    const requests = await prisma.leaveRequest.findMany({
      where: {
        companyId: auth.companyId,
        ...(status !== "all" ? { status } : {}),
        ...(mgrBranch ? { employee: { branchId: mgrBranch } } : {}),
      },
      include: {
        employee: { select: { name: true, department: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      requests.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employee.name,
        department: r.employee.department ?? "",
        position: r.employee.position ?? "",
        type: r.type,
        fromDate: r.fromDate,
        toDate: r.toDate,
        days: r.days,
        reason: r.reason ?? "",
        status: r.status,
        note: r.note ?? "",
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error("[mobile/manager/leave]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
