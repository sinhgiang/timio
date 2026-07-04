import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Lưu / xoá logo công ty (owner). value = data URI base64 hoặc null để xoá.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { logoUrl } = (await req.json()) as { logoUrl: string | null };

  // Giới hạn ~400KB base64 để tránh phình DB
  if (logoUrl && logoUrl.length > 550_000) {
    return NextResponse.json({ error: "Ảnh quá lớn, vui lòng dùng ảnh nhỏ hơn (~400KB)." }, { status: 400 });
  }
  if (logoUrl && !logoUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "File không hợp lệ (phải là ảnh)." }, { status: 400 });
  }

  await prisma.company.update({
    where: { id: user.companyId },
    data: { logoUrl: logoUrl || null },
  });

  return NextResponse.json({ ok: true });
}
