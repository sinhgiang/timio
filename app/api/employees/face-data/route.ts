import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json([], { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active", faceDescriptors: { not: null } },
    select: { id: true, name: true, faceDescriptors: true },
  });

  const data = employees.map((e) => ({
    id: e.id,
    name: e.name,
    descriptors: JSON.parse(e.faceDescriptors!) as number[][],
  }));

  return NextResponse.json(data);
}
