import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — nhân viên gửi yêu cầu điều chỉnh
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, date, type, requestedCheckIn, requestedCheckOut, reason } = body;

    if (!employeeId || !date || !type || !reason) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }
    if (type === "check_in" && !requestedCheckIn) {
      return NextResponse.json({ error: "Vui lòng nhập giờ vào đề nghị" }, { status: 400 });
    }
    if (type === "check_out" && !requestedCheckOut) {
      return NextResponse.json({ error: "Vui lòng nhập giờ ra đề nghị" }, { status: 400 });
    }

    // Kiểm tra nhân viên tồn tại
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    }

    // Không cho phép gửi 2 yêu cầu cùng ngày cùng loại
    const existing = await prisma.correctionRequest.findFirst({
      where: { employeeId, date, type, status: { in: ["pending", "approved"] } },
    });
    if (existing) {
      return NextResponse.json({ error: "Đã có yêu cầu điều chỉnh cho ngày này" }, { status: 409 });
    }

    const correction = await prisma.correctionRequest.create({
      data: {
        employeeId,
        date,
        type,
        requestedCheckIn: requestedCheckIn || null,
        requestedCheckOut: requestedCheckOut || null,
        reason,
        status: "pending",
      },
    });

    return NextResponse.json(correction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// GET — HR xem danh sách yêu cầu điều chỉnh
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "pending";

    const corrections = await prisma.correctionRequest.findMany({
      where: {
        employee: { companyId },
        ...(status !== "all" ? { status } : {}),
      },
      include: {
        employee: { select: { name: true, code: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(corrections);
  } catch {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
