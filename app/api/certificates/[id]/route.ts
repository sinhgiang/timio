import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.certificate.delete({
      where: { id: params.id, companyId: user.companyId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
