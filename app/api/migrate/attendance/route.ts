import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AttendanceRecord {
  employeeCode: string;
  employeeName?: string;
  date: string;       // YYYY-MM-DD
  checkInTime?: string;  // HH:mm
  checkOutTime?: string; // HH:mm
  minutesLate?: number;
}

function parseMinutesLate(val: number | undefined): number {
  if (!val || isNaN(val)) return 0;
  return Math.max(0, Math.round(val));
}

function deriveStatus(minutesLate: number): string {
  if (minutesLate <= 0) return "on_time";
  if (minutesLate <= 15) return "late";
  return "very_late";
}

// VN local time (HH:mm) + date (YYYY-MM-DD) → UTC Date
function vnToUtc(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const base = new Date(`${date}T00:00:00.000Z`);
  base.setTime(base.getTime() + (h * 60 + m - 7 * 60) * 60000);
  return base;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let records: AttendanceRecord[];
  try {
    records = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(records) || records.length === 0)
    return NextResponse.json({ error: "Không có dữ liệu" }, { status: 400 });

  if (records.length > 5000)
    return NextResponse.json({ error: "Tối đa 5.000 bản ghi mỗi lần" }, { status: 400 });

  // Build employee lookup: code → {id, branchId}
  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: { id: true, code: true, name: true, branchId: true },
  });
  const byCode: Record<string, typeof employees[0]> = {};
  const byName: Record<string, typeof employees[0]> = {};
  for (const e of employees) {
    byCode[e.code.trim().toLowerCase()] = e;
    byName[e.name.trim().toLowerCase()] = e;
  }

  let created = 0, skipped = 0;
  const unmatched: string[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 1;

    // Match employee
    const codeKey = rec.employeeCode?.trim().toLowerCase() ?? "";
    const nameKey = rec.employeeName?.trim().toLowerCase() ?? "";
    const emp = byCode[codeKey] ?? byName[nameKey];
    if (!emp) {
      unmatched.push(rec.employeeCode || rec.employeeName || `row ${rowNum}`);
      continue;
    }

    const date = rec.date?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row: rowNum, error: `Ngày không hợp lệ: ${rec.date}` });
      continue;
    }

    // Build check-in/out DateTimes (VN time → UTC)
    let checkInAt: Date | undefined;
    let checkOutAt: Date | undefined;
    try {
      if (rec.checkInTime) checkInAt = vnToUtc(date, rec.checkInTime);
      if (rec.checkOutTime) checkOutAt = vnToUtc(date, rec.checkOutTime);
    } catch {
      errors.push({ row: rowNum, error: "Giờ không hợp lệ" });
      continue;
    }

    const minutesLate = parseMinutesLate(rec.minutesLate);
    const status = deriveStatus(minutesLate);

    try {
      await prisma.attendanceLog.upsert({
        where: { employeeId_date: { employeeId: emp.id, date } },
        create: {
          employeeId: emp.id,
          branchId: emp.branchId,
          date,
          checkInAt: checkInAt ?? null,
          checkOutAt: checkOutAt ?? null,
          minutesLate,
          status,
          penaltyAmount: 0,
        },
        update: {},  // skip if already exists
      });
      created++;
    } catch {
      skipped++;
    }
  }

  const uniqueUnmatched = unmatched.filter((v, i, a) => a.indexOf(v) === i);
  return NextResponse.json({ created, skipped, unmatched: uniqueUnmatched, errors });
}
