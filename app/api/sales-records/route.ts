import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM

  const records = await prisma.salesRecord.findMany({
    where: { companyId, ...(month ? { month } : {}) },
    include: {
      employee: { select: { id: true, name: true, code: true, department: true, salaryType: true, commissionRate: true, kpiTarget: true, kpiBonus: true } },
    },
    orderBy: [{ month: "desc" }, { employee: { name: "asc" } }],
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, month, salesAmount, kpiScore, note } = await req.json();
  if (!employeeId || !month) return NextResponse.json({ error: "Thiếu employeeId hoặc month" }, { status: 400 });

  const record = await prisma.salesRecord.upsert({
    where: { employeeId_month: { employeeId, month } },
    update: { salesAmount: Number(salesAmount) || 0, kpiScore: kpiScore != null ? Number(kpiScore) : null, note: note || null },
    create: { companyId, employeeId, month, salesAmount: Number(salesAmount) || 0, kpiScore: kpiScore != null ? Number(kpiScore) : null, note: note || null },
    include: {
      employee: { select: { id: true, name: true, code: true, salaryType: true, commissionRate: true, kpiTarget: true, kpiBonus: true } },
    },
  });

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.salesRecord.deleteMany({ where: { id, companyId } });
  return NextResponse.json({ ok: true });
}
