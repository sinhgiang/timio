import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, department, location, description, requirements, salaryMin, salaryMax, status } = await req.json();

  const job = await prisma.jobPosting.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(title !== undefined && { title }),
      ...(department !== undefined && { department: department || null }),
      ...(location !== undefined && { location: location || null }),
      ...(description !== undefined && { description: description || null }),
      ...(requirements !== undefined && { requirements: requirements || null }),
      ...(salaryMin !== undefined && { salaryMin: salaryMin ? Number(salaryMin) : null }),
      ...(salaryMax !== undefined && { salaryMax: salaryMax ? Number(salaryMax) : null }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(job);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.jobPosting.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
