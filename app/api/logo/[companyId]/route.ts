import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Phục vụ logo công ty dưới dạng ảnh thật (để email/ứng dụng khác hiển thị được).
// Công khai — không cần đăng nhập (email client tải ảnh ẩn danh).
export async function GET(_req: NextRequest, { params }: { params: { companyId: string } }) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { logoUrl: true },
  });

  const dataUri = company?.logoUrl;
  if (!dataUri || !dataUri.startsWith("data:")) {
    return new NextResponse(null, { status: 404 });
  }

  // Tách "data:image/png;base64,XXXX"
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new NextResponse(null, { status: 404 });

  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
