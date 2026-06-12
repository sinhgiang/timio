import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkSuperAdmin(session: any) {
  return session?.user && (session.user as { role?: string }).role === "super_admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!checkSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admins: { select: { email: true, name: true, role: true }, take: 1 },
      _count: { select: { employees: true } },
    },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!checkSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { companyName, slug, adminEmail, adminName, password } = await req.json();

  if (!companyName || !slug || !adminEmail || !password) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  // Check slug uniqueness
  const existingCompany = await prisma.company.findUnique({ where: { slug } });
  if (existingCompany) return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) return NextResponse.json({ error: "Email đã được dùng" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(password, 12);

  const company = await prisma.$transaction(async (tx) => {
    const c = await tx.company.create({
      data: { name: companyName, slug, plan: "starter" },
    });
    await tx.admin.create({
      data: { companyId: c.id, email: adminEmail, name: adminName || companyName, password: hashedPassword, role: "admin" },
    });
    await tx.branch.create({
      data: { companyId: c.id, name: "Văn phòng chính" },
    });
    return c;
  });

  return NextResponse.json({
    companyId: company.id,
    companyName,
    slug,
    adminEmail,
    password, // return plain text once so super admin can copy it
    loginUrl: "https://timio.vn/login",
    checkinUrl: `https://timio.vn/checkin/${slug}`,
  }, { status: 201 });
}
