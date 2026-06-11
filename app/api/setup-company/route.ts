import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSetupToken } from "@/lib/setupToken";

function toSlug(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50) || "cong-ty";
}

export async function POST(req: NextRequest) {
  const { email, name, companyName } = await req.json().catch(() => ({}));
  if (!email || !companyName) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  // Check if already created (double-submit protection)
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ success: true });

  // Generate unique slug
  let baseSlug = toSlug(companyName);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, slug, plan: "starter" },
    });
    await tx.admin.create({
      data: {
        companyId: company.id,
        email,
        name: name || companyName,
        role: "admin",
      },
    });
    await tx.branch.create({
      data: { companyId: company.id, name: "Văn phòng chính" },
    });
  });

  return NextResponse.json({ success: true, setupToken: createSetupToken(email) });
}
