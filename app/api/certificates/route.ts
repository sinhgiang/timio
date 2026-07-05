import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeBranchWhere } from "@/lib/branchScope";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const certificates = await prisma.certificate.findMany({
      where: {
        companyId: user.companyId,
        ...(employeeId ? { employeeId } : {}),
        ...employeeBranchWhere(user),
      },
      include: { employee: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(certificates);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { employeeId, name, issuer, issueDate, expiryDate, note } = await req.json();

    if (!employeeId || !name) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Verify employee belongs to this company
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId, companyId: user.companyId },
    });
    if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

    const certificate = await prisma.certificate.create({
      data: {
        companyId: user.companyId,
        employeeId,
        name,
        issuer: issuer || null,
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        note: note || null,
      },
      include: { employee: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
