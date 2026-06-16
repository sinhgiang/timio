import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signFaceToken } from "@/lib/faceToken";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId } = await req.json() as { employeeId: string };

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true, name: true },
  });
  if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

  const token = signFaceToken(employeeId, companyId, employee.name);
  return NextResponse.json({ token });
}
