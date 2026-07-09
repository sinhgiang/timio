import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kiosk/checklists?slug=...&employeeId=...
// Trả checklist mà người vừa quét mặt liên quan:
//  - "self": onboarding/offboarding tự xác nhận (như cũ)
//  - "giver": người NGHỈ VIỆC trong 1 đơn bàn giao (chờ họ xác nhận GIAO)
//  - "receiver": người KẾ NHIỆM (chờ họ xác nhận NHẬN, sau khi người nghỉ đã giao)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const employeeId = searchParams.get("employeeId");
  if (!slug || !employeeId) return NextResponse.json({ error: "Thiếu slug hoặc employeeId" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, companyId: company.id }, select: { id: true, name: true, code: true } });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  const raw = await prisma.employeeChecklist.findMany({
    where: { companyId: company.id, status: { not: "done" }, OR: [{ employeeId }, { handoverToEmployeeId: employeeId }] },
    include: { template: { select: { name: true } }, employee: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // tên người kế nhiệm
  const receiverIds = Array.from(new Set(raw.map((c) => c.handoverToEmployeeId).filter(Boolean))) as string[];
  const receivers = receiverIds.length ? await prisma.employee.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true } }) : [];
  const receiverName = new Map(receivers.map((r) => [r.id, r.name]));

  const checklists = raw.map((c) => {
    const isHandover = !!c.handoverToEmployeeId;
    const role = !isHandover ? "self" : c.employeeId === employeeId ? "giver" : "receiver";
    return {
      id: c.id, type: c.type, templateName: c.template?.name ?? "", tasks: c.tasks, status: c.status,
      confirmedAt: c.confirmedAt ? c.confirmedAt.toISOString() : null,
      isHandover, role,
      giverName: c.employee?.name ?? "", receiverName: c.handoverToEmployeeId ? (receiverName.get(c.handoverToEmployeeId) ?? "") : "",
      giverConfirmedAt: c.giverConfirmedAt ? c.giverConfirmedAt.toISOString() : null,
      receiverConfirmedAt: c.receiverConfirmedAt ? c.receiverConfirmedAt.toISOString() : null,
      assets: c.assets ?? "[]",
    };
  });

  return NextResponse.json({ employee, checklists });
}
