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
  const employeeId = searchParams.get("employeeId");

  const claims = await prisma.expenseClaim.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
    include: { employee: { select: { id: true, name: true, code: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(claims);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, title, category, amount, date, description, receiptUrl } = await req.json();
  if (!employeeId || !title || !amount || !date) return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });

  const claim = await prisma.expenseClaim.create({
    data: {
      companyId,
      employeeId,
      title,
      category: category || "other",
      amount: Number(amount),
      date,
      description: description || null,
      receiptUrl: receiptUrl || null,
    },
    include: { employee: { select: { id: true, name: true, code: true } } },
  });

  return NextResponse.json(claim, { status: 201 });
}
