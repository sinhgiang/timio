import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createManagerToken } from "@/lib/mobileAuth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập email và mật khẩu" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { company: { select: { id: true, name: true, slug: true } } },
    });

    if (!admin || !admin.password) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const match = await bcrypt.compare(String(password), admin.password);
    if (!match) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 });
    }

    const token = createManagerToken(admin.id, admin.companyId, admin.email, admin.branchId, admin.role);

    return NextResponse.json({
      token,
      adminId: admin.id,
      companyId: admin.companyId,
      companyName: admin.company.name,
      companySlug: admin.company.slug,
      adminName: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (err) {
    console.error("[mobile/manager-auth]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
