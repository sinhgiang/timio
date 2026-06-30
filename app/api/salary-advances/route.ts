import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const advances = await prisma.salaryAdvance.findMany({
    where: {
      companyId: user.companyId, year, month,
      employee: scopedBranchId ? { branchId: scopedBranchId } : undefined,
    },
    include: {
      employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(advances);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, year, month, amount, note } = await req.json();
  if (!employeeId || !year || !month || !amount || amount <= 0) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId: user.companyId } });
  if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

  const advance = await prisma.salaryAdvance.create({
    data: {
      companyId: user.companyId,
      employeeId,
      year: parseInt(year),
      month: parseInt(month),
      amount: parseInt(amount),
      note: note || null,
      status: "pending",
    },
    include: {
      employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
    },
  });

  return NextResponse.json(advance, { status: 201 });
}
