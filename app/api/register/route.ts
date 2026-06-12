import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function toSlug(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

export async function POST(req: NextRequest) {
  const { companyName, email, password } = await req.json().catch(() => ({}));

  if (!companyName || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải ít nhất 6 ký tự" }, { status: 400 });
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
  }

  // Generate unique slug
  let baseSlug = toSlug(companyName) || "cong-ty";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, slug, plan: "starter" },
    });
    await tx.admin.create({
      data: { companyId: company.id, email, name: companyName, password: hashedPassword, role: "admin" },
    });
    await tx.branch.create({
      data: { companyId: company.id, name: "Văn phòng chính" },
    });
  });

  return NextResponse.json({ success: true, email });
}
