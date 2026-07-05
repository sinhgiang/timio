import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cert = await prisma.certificate.findFirst({ where: { id: params.id, companyId: user.companyId }, select: { employeeId: true } });
    if (!cert) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    if (!(await employeeInScope(user, cert.employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

    await prisma.certificate.delete({
      where: { id: params.id, companyId: user.companyId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
