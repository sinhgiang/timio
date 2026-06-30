import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const status = searchParams.get("status");

  const candidates = await prisma.candidate.findMany({
    where: {
      companyId,
      ...(jobId ? { jobId } : {}),
      ...(status ? { status } : {}),
    },
    include: { job: { select: { id: true, title: true, department: true } } },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, name, email, phone, source, notes } = await req.json();
  if (!jobId || !name) return NextResponse.json({ error: "Thiếu jobId hoặc tên ứng viên" }, { status: 400 });

  const candidate = await prisma.candidate.create({
    data: {
      companyId,
      jobId,
      name,
      email: email || null,
      phone: phone || null,
      source: source || null,
      notes: notes || null,
    },
    include: { job: { select: { id: true, title: true, department: true } } },
  });

  return NextResponse.json(candidate, { status: 201 });
}
