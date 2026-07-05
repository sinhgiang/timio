import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPin } from "@/lib/mobileEmployeeAuth";

const VALID_TYPES = ["annual", "sick", "unpaid", "maternity", "other"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const { employeeId, pin, type, fromDate, toDate, reason } = body as {
      employeeId?: string;
      pin?: string;
      type?: string;
      fromDate?: string;
      toDate?: string;
      reason?: string;
    };

    if (!employeeId || !pin) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, status: "active" },
      select: { pin: true, companyId: true },
    });

    if (!employee || !(await checkPin(employee.pin, pin))) {
      return NextResponse.json({ error: "Sai mã PIN" }, { status: 401 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Loại nghỉ phép không hợp lệ" }, { status: 400 });
    }

    if (!fromDate || !toDate || !DATE_RE.test(fromDate) || !DATE_RE.test(toDate)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { error: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" },
        { status: 400 }
      );
    }

    // Số ngày nghỉ (tính cả ngày đầu và ngày cuối)
    const from = new Date(`${fromDate}T00:00:00Z`);
    const to = new Date(`${toDate}T00:00:00Z`);
    const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

    const created = await prisma.leaveRequest.create({
      data: {
        employeeId,
        companyId: employee.companyId,
        type,
        fromDate,
        toDate,
        days,
        reason: reason ?? null,
        status: "pending",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error("[mobile/employee/leave]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
