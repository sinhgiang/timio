import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId là bắt buộc" }, { status: 400 });
  }

  try {
    const history = await prisma.workHistory.findMany({
      where: { companyId: user.companyId, employeeId },
      orderBy: { date: "desc" },
      include: {
        employee: { select: { id: true, name: true, code: true } },
      },
    });
    return NextResponse.json(history);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date, type, description, oldValue, newValue, note } =
    await req.json() as {
      employeeId: string;
      date: string;
      type: string;
      description: string;
      oldValue?: string;
      newValue?: string;
      note?: string;
    };

  if (!employeeId || !date || !type || !description) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const validTypes = [
    "promotion",
    "transfer",
    "salary_change",
    "title_change",
    "department_change",
    "other",
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Loại sự kiện không hợp lệ" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: user.companyId },
  });
  if (!employee) {
    return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
  }

  try {
    const entry = await prisma.workHistory.create({
      data: {
        companyId: user.companyId,
        employeeId,
        date,
        type,
        description,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
        note: note ?? null,
      },
      include: {
        employee: { select: { id: true, name: true, code: true } },
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server khi tạo lịch sử công tác" }, { status: 500 });
  }
}
