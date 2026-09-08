import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { parseShiftSessions } from "@/lib/shiftResolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — lịch sử chấm công gần đây của chính chủ (tất cả nơi làm), gom theo NGÀY
// để hiện đủ các buổi (ca gãy sáng/tối) trong 1 thẻ thay vì rời rạc từng dòng.
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: { id: true, shiftOverride: true, company: { select: { name: true } } },
  });
  const empIds = employees.map((e) => e.id);
  const nameByEmp = new Map(employees.map((e) => [e.id, e.company?.name ?? "Công ty"]));
  const sessionsByEmp = new Map(employees.map((e) => [e.id, parseShiftSessions(e.shiftOverride)]));
  if (!empIds.length) return NextResponse.json({ days: [], logs: [], summary: { total: 0, onTime: 0, late: 0 } });

  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: { in: empIds }, checkInAt: { not: null } },
    select: { employeeId: true, date: true, session: true, checkInAt: true, checkOutAt: true, minutesLate: true, status: true, penaltyAmount: true },
    orderBy: [{ date: "desc" }, { session: "asc" }],
    take: 60,
  });

  const [total, onTime] = await Promise.all([
    prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null } } }),
    prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 } }),
  ]);

  // Gom các dòng cùng nhân viên + cùng ngày thành 1 "ngày" chứa nhiều buổi (ca gãy sáng/tối).
  // penaltyAmount trả kèm để NV thấy ngay tại đây "trễ bao nhiêu -> bị trừ bao nhiêu tiền", khớp
  // với dòng "Phạt" tổng cộng ở Phiếu lương — tránh NV thấy "Trễ 99 phút" mà không hiểu vì sao lương bị trừ.
  type Sess = { session: string; sessionLabel: string | null; checkInAt: string | null; checkOutAt: string | null; minutesLate: number; status: string; penaltyAmount: number };
  type Day = { date: string; employeeId: string; companyName: string; sessions: Sess[] };
  const dayByKey = new Map<string, Day>();
  const order: string[] = [];
  for (const l of logs) {
    const key = `${l.employeeId}|${l.date}`;
    if (!dayByKey.has(key)) {
      dayByKey.set(key, { date: l.date, employeeId: l.employeeId, companyName: nameByEmp.get(l.employeeId) ?? "Công ty", sessions: [] });
      order.push(key);
    }
    const sessions = sessionsByEmp.get(l.employeeId) ?? null;
    const idx = Number(l.session);
    const sessionLabel = sessions && Number.isInteger(idx) && sessions[idx] ? (sessions[idx].label || `Buổi ${idx + 1}`) : null;
    dayByKey.get(key)!.sessions.push({
      session: l.session,
      sessionLabel,
      checkInAt: l.checkInAt ? l.checkInAt.toISOString() : null,
      checkOutAt: l.checkOutAt ? l.checkOutAt.toISOString() : null,
      minutesLate: l.minutesLate,
      status: l.status,
      penaltyAmount: l.penaltyAmount,
    });
  }
  const days = order.map((k) => dayByKey.get(k)!);

  return NextResponse.json({
    summary: { total, onTime, late: total - onTime },
    days,
    // giữ "logs" (dạng cũ, phẳng) để tương thích ngược nếu còn nơi khác dùng
    logs: logs.map((l) => ({
      date: l.date,
      checkInAt: l.checkInAt ? l.checkInAt.toISOString() : null,
      checkOutAt: l.checkOutAt ? l.checkOutAt.toISOString() : null,
      minutesLate: l.minutesLate,
      status: l.status,
      companyName: nameByEmp.get(l.employeeId) ?? "Công ty",
    })),
  });
}
