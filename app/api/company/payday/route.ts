import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paydayOfMonth } = await req.json();
  const day = parseInt(paydayOfMonth);
  if (!day || day < 1 || day > 31) {
    return NextResponse.json({ error: "Ngày phát lương phải từ 1-31" }, { status: 400 });
  }

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { paydayOfMonth: day },
      select: { paydayOfMonth: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi lưu — vui lòng chạy SQL migration" }, { status: 500 });
  }
}
