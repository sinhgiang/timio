import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const histories = await prisma.salaryHistory.findMany({
      where: {
        companyId: user.companyId,
        ...(employeeId ? { employeeId } : {}),
      },
      include: { employee: { select: { id: true, name: true, code: true } } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(histories);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
