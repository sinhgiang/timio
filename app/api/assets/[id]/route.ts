import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.asset.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy tài sản" }, { status: 404 });

  const body = await req.json() as {
    status?: string;
    employeeId?: string | null;
    assignedAt?: string | null;
    returnedAt?: string | null;
    note?: string | null;
  };

  const allowedStatuses = ["available", "assigned", "damaged", "lost"];
  if (body.status && !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  // Branch manager: nếu gán tài sản cho 1 nhân viên, nhân viên đó phải thuộc chi nhánh mình
  if (body.employeeId && !(await employeeInScope(user, body.employeeId))) {
    return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });
  }

  try {
    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.employeeId !== undefined ? { employeeId: body.employeeId } : {}),
        ...(body.assignedAt !== undefined
          ? { assignedAt: body.assignedAt ? new Date(body.assignedAt) : null }
          : {}),
        ...(body.returnedAt !== undefined
          ? { returnedAt: body.returnedAt ? new Date(body.returnedAt) : null }
          : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, code: true, department: true } },
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi server khi cập nhật tài sản" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.asset.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy tài sản" }, { status: 404 });

  if (existing.status !== "available") {
    return NextResponse.json(
      { error: "Chỉ có thể xóa tài sản ở trạng thái Còn trống" },
      { status: 400 }
    );
  }

  try {
    await prisma.asset.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server khi xóa tài sản" }, { status: 500 });
  }
}
