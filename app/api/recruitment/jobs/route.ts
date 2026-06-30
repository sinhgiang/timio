import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.jobPosting.findMany({
    where: { companyId, ...(status ? { status } : {}) },
    include: { _count: { select: { candidates: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, department, location, description, requirements, salaryMin, salaryMax } = await req.json();
  if (!title) return NextResponse.json({ error: "Thiếu tiêu đề vị trí" }, { status: 400 });

  const job = await prisma.jobPosting.create({
    data: {
      companyId,
      title,
      department: department || null,
      location: location || null,
      description: description || null,
      requirements: requirements || null,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
