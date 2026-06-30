import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employeeId = req.nextUrl.searchParams.get("employeeId") ?? undefined;
    const scopedBranchId = user?.role === "manager" && user?.branchId ? user.branchId : null;

    const records = await prisma.disciplineRecord.findMany({
      where: {
        companyId,
        ...(employeeId ? { employeeId } : {}),
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET /api/discipline-records error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { employeeId, type, date, reason, note } = body as {
      employeeId?: string;
      type?: string;
      date?: string;
      reason?: string;
      note?: string;
    };

    if (!employeeId || !type || !date || !reason) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const validTypes = ["warning", "serious_warning", "suspension", "dismissal"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Loại kỷ luật không hợp lệ" }, { status: 400 });
    }

    // Verify employee belongs to this company
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true },
    });
    if (!employee) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

    const record = await prisma.disciplineRecord.create({
      data: {
        companyId,
        employeeId,
        type,
        date,
        reason,
        note: note ?? null,
      },
      include: {
        employee: {
          select: { id: true, name: true, code: true, department: true },
        },
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("POST /api/discipline-records error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
