import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 30);
}

export async function POST(req: NextRequest) {
  const { name, email, phone, channel } = await req.json().catch(() => ({}));

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Vui lòng điền đầy đủ họ tên và email" }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();
  const existing = await prisma.affiliate.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "Email này đã đăng ký làm đối tác rồi", code: existing.code }, { status: 409 });
  }

  // Generate unique code
  let base = toCode(name.trim()) || "partner";
  let code = base;
  let attempt = 0;
  while (await prisma.affiliate.findUnique({ where: { code } })) {
    attempt++;
    code = `${base}-${attempt}`;
  }

  const affiliate = await prisma.affiliate.create({
    data: { name: name.trim(), email: emailLower, code, phone: phone?.trim() || null, channel: channel || null, status: "active" },
  });

  return NextResponse.json({ success: true, code: affiliate.code, name: affiliate.name });
}
