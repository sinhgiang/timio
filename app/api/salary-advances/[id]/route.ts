import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";
import { notifyWorkerByEmployee } from "@/lib/workerNotify";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, disbursed } = body as { status?: string; disbursed?: boolean };

  const existing = await prisma.salaryAdvance.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (!(await employeeInScope(user, existing.employeeId)))
    return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  // Xác nhận đã chi tiền (EWA) — công ty đã chuyển khoản cho NV
  if (disbursed === true) {
    if (existing.status !== "approved")
      return NextResponse.json({ error: "Chỉ đánh dấu đã chi sau khi đã duyệt." }, { status: 400 });
    const paid = await prisma.salaryAdvance.update({
      where: { id: params.id },
      data: { disbursedAt: new Date() },
      include: { employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } } },
    });
    void notifyWorkerByEmployee(existing.employeeId, {
      type: "advance", title: "Công ty đã chuyển tiền ứng lương",
      body: `Khoản ứng ${existing.amount.toLocaleString("vi-VN")}đ đã được chuyển cho bạn.`,
      link: "income", email: true,
    });
    return NextResponse.json(paid);
  }

  if (!status || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  // Tiền đã chuyển thật rồi thì không cho "từ chối" ngược lại nữa — chỉ còn cách Xóa (ghi chú thủ công)
  if (status === "rejected" && existing.disbursedAt) {
    return NextResponse.json({ error: "Khoản này đã chi tiền cho nhân viên, không thể từ chối." }, { status: 400 });
  }

  const wasApproved = existing.status === "approved";

  const updated = await prisma.salaryAdvance.update({
    where: { id: params.id },
    data: {
      status,
      approvedAt: status === "approved" ? new Date() : null,
      // Huỷ duyệt / từ chối thì xoá dấu đã chi cho nhất quán
      disbursedAt: status === "approved" ? existing.disbursedAt : null,
    },
    include: {
      employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
    },
  });

  // Thông báo NV khi đơn ứng lương của họ được duyệt / từ chối — kể cả khi đơn đã TỰ ĐỘNG duyệt
  // (opt.approvalMode === "auto") rồi công ty mới hủy trước lúc chi tiền, không chỉ lúc còn "chờ duyệt".
  if (existing.source === "worker" && existing.status !== status && (status === "approved" || status === "rejected")) {
    void notifyWorkerByEmployee(existing.employeeId, {
      type: "advance",
      title: status === "approved" ? "Đơn ứng lương được duyệt" : (wasApproved ? "Đơn ứng lương đã bị hủy" : "Đơn ứng lương bị từ chối"),
      body: status === "approved"
        ? `Khoản ${existing.amount.toLocaleString("vi-VN")}đ đã duyệt — chờ công ty chuyển tiền.`
        : wasApproved
          ? `Khoản ${existing.amount.toLocaleString("vi-VN")}đ đã duyệt trước đó nhưng bị hủy trước khi chuyển tiền.`
          : `Khoản ${existing.amount.toLocaleString("vi-VN")}đ không được duyệt.`,
      link: "income", email: true,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.salaryAdvance.findFirst({
    where: { id: params.id, companyId: user.companyId },
    select: { employeeId: true },
  });
  if (existing && !(await employeeInScope(user, existing.employeeId)))
    return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  await prisma.salaryAdvance.deleteMany({
    where: { id: params.id, companyId: user.companyId },
  });

  return NextResponse.json({ ok: true });
}
