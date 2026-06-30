import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const employeeId = searchParams.get("employeeId");

  const reviews = await prisma.performanceReview.findMany({
    where: {
      companyId,
      ...(period ? { period } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
    include: { employee: { select: { id: true, name: true, code: true, department: true } } },
    orderBy: [{ period: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, period, type } = await req.json();
  if (!employeeId || !period) return NextResponse.json({ error: "Thiếu employeeId hoặc period" }, { status: 400 });

  const review = await prisma.performanceReview.upsert({
    where: { employeeId_period: { employeeId, period } },
    update: {},
    create: { companyId, employeeId, period, type: type || "quarterly" },
    include: { employee: { select: { id: true, name: true, code: true, department: true } } },
  });

  return NextResponse.json(review, { status: 201 });
}
