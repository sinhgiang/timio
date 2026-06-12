import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminId = (session?.user as { id?: string })?.id;
  // companyId presence means authenticated
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mật khẩu mới phải ít nhất 6 ký tự" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email: session.user.email } });
  if (!admin) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  if (!admin.password) return NextResponse.json({ error: "Tài khoản này dùng đăng nhập Google, không có mật khẩu" }, { status: 400 });
  const match = await bcrypt.compare(currentPassword, admin.password);
  if (!match) return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({ where: { id: admin.id }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
