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
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.disciplineRecord.findFirst({
      where: { id: params.id, companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy hồ sơ kỷ luật" }, { status: 404 });

    await prisma.disciplineRecord.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/discipline-records/[id] error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
