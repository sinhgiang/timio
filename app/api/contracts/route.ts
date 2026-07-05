import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope, managerBranchId } from "@/lib/branchScope";

// GET /api/contracts?employeeId=xxx — list contracts for employee
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "Thiếu employeeId" }, { status: 400 });

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const scopedBranchId = managerBranchId(user);
  const contracts = await prisma.contract.findMany({
    where: { employeeId, employee: { companyId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(contracts);
}

// POST /api/contracts — create contract
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (!company || company.plan !== "business") {
    return NextResponse.json({ error: "Tính năng Hợp đồng lao động chỉ có trong gói Business" }, { status: 403 });
  }

  const { employeeId, type, startDate, endDate, note, fileUrl, fileName } = await req.json();
  if (!employeeId || !type || !startDate) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId } });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
  if (!(await employeeInScope(user, employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  const contract = await prisma.contract.create({
    data: { employeeId, type, startDate, endDate: endDate || null, note: note || null, fileUrl: fileUrl || null, fileName: fileName || null },
  });

  return NextResponse.json(contract, { status: 201 });
}
