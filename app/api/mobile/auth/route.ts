import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { slug, pin } = await req.json();

    if (!slug || !pin) {
      return NextResponse.json({ error: "Vui lòng nhập mã công ty và PIN" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: { id: true, name: true, slug: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Mã công ty không đúng" }, { status: 404 });
    }

    const employee = await prisma.employee.findFirst({
      where: { companyId: company.id, pin: String(pin), status: "active" },
      select: { id: true, name: true, department: true, position: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "PIN không đúng hoặc tài khoản bị khóa" }, { status: 401 });
    }

    return NextResponse.json({
      id: employee.id,
      name: employee.name,
      department: employee.department ?? "",
      position: employee.position ?? "",
      companyName: company.name,
      slug: company.slug,
    });
  } catch (err) {
    console.error("[mobile/auth]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
