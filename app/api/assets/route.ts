import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const employeeId = searchParams.get("employeeId") ?? undefined;

  try {
    const assets = await prisma.asset.findMany({
      where: {
        companyId: user.companyId,
        ...(status ? { status } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, code: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(assets);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, name, category, note } = await req.json() as {
    code: string;
    name: string;
    category?: string;
    note?: string;
  };

  if (!code || !name) {
    return NextResponse.json({ error: "Mã tài sản và tên là bắt buộc" }, { status: 400 });
  }

  try {
    const asset = await prisma.asset.create({
      data: {
        companyId: user.companyId,
        code,
        name,
        category: category ?? null,
        note: note ?? null,
        status: "available",
      },
      include: {
        employee: { select: { id: true, name: true, code: true, department: true } },
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server khi tạo tài sản" }, { status: 500 });
  }
}
