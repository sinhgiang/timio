import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: apply a shift template to employees for a given week
// Body: { employeeIds: string[], weekStart: "YYYY-MM-DD" (Monday) }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeIds, weekStart } = await req.json();
  if (!employeeIds?.length || !weekStart) return NextResponse.json({ error: "Thiếu employeeIds hoặc weekStart" }, { status: 400 });

  const tpl = await prisma.shiftTemplate.findFirst({ where: { id: params.id, companyId } });
  if (!tpl) return NextResponse.json({ error: "Template không tồn tại" }, { status: 404 });

  type DayPattern = { dayOfWeek: number; shiftLabel: string; checkIn: string; checkOut: string };
  const pattern: DayPattern[] = JSON.parse(tpl.pattern);

  // weekStart is Monday (dayOfWeek = 1). Build date for each dayOfWeek 0–6
  const monday = new Date(weekStart + "T00:00:00");

  const assignments: { companyId: string; employeeId: string; date: string; shiftLabel: string; checkIn: string; checkOut: string }[] = [];

  for (const empId of employeeIds) {
    for (const day of pattern) {
      // dayOfWeek: 0=CN, 1=T2, ..., 6=T7
      const offset = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1; // convert to offset from Monday
      const date = new Date(monday);
      date.setDate(monday.getDate() + offset);
      const dateStr = date.toISOString().slice(0, 10);

      assignments.push({
        companyId,
        employeeId: empId,
        date: dateStr,
        shiftLabel: day.shiftLabel,
        checkIn: day.checkIn,
        checkOut: day.checkOut,
      });
    }
  }

  // Upsert: delete existing then create (simple approach)
  const datesSet = new Set(assignments.map(a => a.date));
  const dates = Array.from(datesSet);
  await prisma.shiftAssignment.deleteMany({
    where: { companyId, employeeId: { in: employeeIds }, date: { in: dates } },
  });

  await prisma.shiftAssignment.createMany({ data: assignments });

  return NextResponse.json({ ok: true, created: assignments.length });
}
