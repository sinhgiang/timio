import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const mgrBranch = scopedBranchId(auth);

  try {
    const { status, note } = await req.json();
    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findFirst({
      where: { id: params.id, companyId: auth.companyId },
      include: { employee: { select: { branchId: true } } },
    });

    if (!leave) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

    // Branch manager chỉ được duyệt/từ chối đơn của nhân viên thuộc chi nhánh mình
    if (mgrBranch && leave.employee.branchId !== mgrBranch) {
      return NextResponse.json({ error: "Không có quyền với đơn của chi nhánh khác" }, { status: 403 });
    }

    if (leave.status !== "pending") {
      return NextResponse.json({ error: "Đơn đã được xử lý" }, { status: 409 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status, note: note ?? null },
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("[mobile/manager/leave/[id]]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
