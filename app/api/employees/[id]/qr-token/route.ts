import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true, qrToken: true },
  });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (employee.qrToken) {
    return NextResponse.json({ qrToken: employee.qrToken, name: employee.name });
  }

  // Generate new token
  const qrToken = randomBytes(20).toString("hex");
  try {
    await prisma.employee.update({ where: { id: params.id }, data: { qrToken } });
    return NextResponse.json({ qrToken, name: employee.name });
  } catch {
    return NextResponse.json({ error: "Lỗi tạo QR token — vui lòng chạy SQL migration" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findFirst({ where: { id: params.id, companyId } });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const newToken = randomBytes(20).toString("hex");
  try {
    await prisma.employee.update({ where: { id: params.id }, data: { qrToken: newToken } });
    return NextResponse.json({ qrToken: newToken, message: "Đã cấp lại mã QR mới" });
  } catch {
    return NextResponse.json({ error: "Lỗi cấp lại QR" }, { status: 500 });
  }
}
