import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyFaceToken } from "@/lib/faceToken";

export async function POST(req: NextRequest) {
  const { token, descriptors } = await req.json() as { token: string; descriptors: number[][] };

  const payload = verifyFaceToken(token);
  if (!payload) return NextResponse.json({ error: "Link đã hết hạn hoặc không hợp lệ" }, { status: 401 });

  if (!Array.isArray(descriptors) || descriptors.length < 3) {
    return NextResponse.json({ error: "Cần ít nhất 3 mẫu khuôn mặt" }, { status: 400 });
  }

  await prisma.employee.update({
    where: { id: payload.employeeId },
    data: { faceDescriptors: JSON.stringify(descriptors) },
  });

  return NextResponse.json({ ok: true, name: payload.employeeName });
}
