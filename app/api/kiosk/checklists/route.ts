import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kiosk/checklists?slug=...&employeeId=...
// Public (kiosk): trả về các checklist ĐANG THỰC HIỆN của 1 nhân viên trong công ty theo slug.
// Danh tính nhân viên đã được xác minh bằng quét mặt ở phía client (giống kiosk chấm công).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const employeeId = searchParams.get("employeeId");

  if (!slug || !employeeId) {
    return NextResponse.json({ error: "Thiếu slug hoặc employeeId" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: company.id },
    select: { id: true, name: true, code: true },
  });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  const checklists = await prisma.employeeChecklist.findMany({
    where: { companyId: company.id, employeeId },
    include: { template: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    employee,
    checklists: checklists.map((c) => ({
      id: c.id,
      type: c.type,
      templateName: c.template?.name ?? "",
      tasks: c.tasks,
      status: c.status,
      confirmedAt: c.confirmedAt ? c.confirmedAt.toISOString() : null,
    })),
  });
}
