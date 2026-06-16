import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { zaloOaToken } = await req.json();

  await prisma.company.update({
    where: { id: user.companyId },
    data: { zaloOaToken: zaloOaToken || null },
  });

  return NextResponse.json({ ok: true });
}
