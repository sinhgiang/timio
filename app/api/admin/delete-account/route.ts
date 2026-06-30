import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Chỉ chủ tài khoản mới có thể xóa" }, { status: 403 });

  const companyId = user.companyId;

  try {
    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

    // Delete the admin record first (to remove login)
    if (user.email) {
      await prisma.admin.deleteMany({ where: { companyId, email: user.email } });
    }

    // Delete company — cascade deletes all related data via Prisma schema
    await prisma.company.delete({ where: { id: companyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Xóa tài khoản thất bại" }, { status: 500 });
  }
}
