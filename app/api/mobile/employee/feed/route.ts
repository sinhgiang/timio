import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPin } from "@/lib/mobileEmployeeAuth";

const VN_TZ = "Asia/Ho_Chi_Minh";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const pin = searchParams.get("pin");

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

    const now = new Date();
    const year = new Date().toLocaleDateString("sv-SE", { timeZone: VN_TZ }).slice(0, 4);

    const [announcements, holidays] = await Promise.all([
      prisma.announcement.findMany({
        where: {
          companyId: employee.companyId,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 20,
        select: {
          title: true,
          content: true,
          type: true,
          pinned: true,
          publishedAt: true,
        },
      }),
      prisma.holiday.findMany({
        where: { companyId: employee.companyId, date: { startsWith: year } },
        orderBy: { date: "asc" },
        select: { date: true, name: true },
      }),
    ]);

    return NextResponse.json({
      announcements,
      holidays,
    });
  } catch (err) {
    console.error("[mobile/employee/feed]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
