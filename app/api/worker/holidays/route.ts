import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — liệt kê các đợt "Ngày lễ" của (các) công ty NV đang làm, để hiện trong tab Nghỉ phép:
// - mode "fixed": chỉ để THÔNG BÁO (công ty đã tự áp dụng, không cần NV làm gì) — sắp tới hoặc đang diễn ra.
// - mode "flexible": NV được TỰ CHỌN ngày trong khoảng, tối đa maxDays ngày — kèm số ngày đã
//   dùng (pending + approved) để FE biết còn được chọn bao nhiêu ngày nữa.
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id, status: "active" },
    select: { id: true, companyId: true },
  });
  if (employees.length === 0) return NextResponse.json({ holidays: [] });

  const companyIds = Array.from(new Set(employees.map((e) => e.companyId)));
  const empByCompany = new Map(employees.map((e) => [e.companyId, e.id]));

  // Chỉ lấy đợt lễ còn liên quan: chưa kết thúc quá 30 ngày (để NV vẫn thấy đợt vừa qua 1 chút).
  const today = new Date();
  const cutoff = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const holidays = await prisma.holiday.findMany({
    where: { companyId: { in: companyIds }, OR: [{ endDate: { gte: cutoff } }, { endDate: null, date: { gte: cutoff } }] },
    orderBy: { date: "asc" },
  });

  const flexibleIds = holidays.filter((h) => h.mode === "flexible").map((h) => h.id);
  const usedByHoliday = new Map<string, Set<string>>();
  if (flexibleIds.length > 0) {
    const myRequests = await prisma.leaveRequest.findMany({
      where: {
        holidayId: { in: flexibleIds },
        employeeId: { in: employees.map((e) => e.id) },
        status: { in: ["pending", "approved"] },
      },
      select: { holidayId: true, dates: true },
    });
    for (const r of myRequests) {
      if (!r.holidayId) continue;
      const set = usedByHoliday.get(r.holidayId) ?? new Set<string>();
      if (r.dates) (JSON.parse(r.dates) as string[]).forEach((d) => set.add(d));
      usedByHoliday.set(r.holidayId, set);
    }
  }

  return NextResponse.json({
    holidays: holidays.map((h) => ({
      id: h.id,
      companyId: h.companyId,
      employeeId: empByCompany.get(h.companyId) ?? null,
      name: h.name,
      mode: h.mode,
      startDate: h.date,
      endDate: h.endDate || h.date,
      totalDays: h.totalDays ?? null,
      maxDays: h.maxDays ?? null,
      usedDates: Array.from(usedByHoliday.get(h.id) ?? []).sort(),
    })),
  });
}
