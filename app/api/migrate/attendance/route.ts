import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface AttendanceRecord {
  employeeCode: string;
  employeeName?: string;
  date: string;         // YYYY-MM-DD
  checkInTime?: string; // HH:mm
  checkOutTime?: string;// HH:mm
  minutesLate?: number;
}

function parseMinutesLate(val: number | undefined): number {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return Math.max(0, Math.round(Number(val)));
}

function deriveStatus(minutesLate: number): string {
  if (minutesLate <= 0) return "on_time";
  if (minutesLate <= 15) return "late";
  return "very_late";
}

// VN local time (HH:mm) + date (YYYY-MM-DD) → UTC Date
function vnToUtc(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) throw new Error("Invalid time");
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
    where: { companyId },
    select: { id: true, code: true, name: true, branchId: true },
  });
  const byCode: Record<string, typeof employees[0]> = {};
  const byName: Record<string, typeof employees[0]> = {};
  for (const e of employees) {
    if (e.code) byCode[e.code.trim().toLowerCase()] = e;
    if (e.name) byName[e.name.trim().toLowerCase()] = e;
  }

  const unmatched: string[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  interface LogRow {
    employeeId: string;
    branchId: string;
    date: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    minutesLate: number;
    status: string;
    penaltyAmount: number;
  }

  const toCreate: LogRow[] = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 1;

    // Match employee by code first, then by name
    const codeKey = (rec.employeeCode ?? "").trim().toLowerCase();
    const nameKey = (rec.employeeName ?? "").trim().toLowerCase();
    const emp = (codeKey && byCode[codeKey]) || (nameKey && byName[nameKey]);

    if (!emp) {
      const label = rec.employeeCode || rec.employeeName || "";
      if (label) unmatched.push(label);
      continue;
    }

    const date = (rec.date ?? "").trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push({ row: rowNum, error: `Ngày không hợp lệ: "${rec.date}"` });
      continue;
    }

    let checkInAt: Date | null = null;
    let checkOutAt: Date | null = null;
    try {
      if (rec.checkInTime) checkInAt = vnToUtc(date, rec.checkInTime);
      if (rec.checkOutTime) checkOutAt = vnToUtc(date, rec.checkOutTime);
    } catch {
      errors.push({ row: rowNum, error: `Giờ không hợp lệ (check-in: "${rec.checkInTime}", check-out: "${rec.checkOutTime}")` });
      continue;
    }

    const minutesLate = parseMinutesLate(rec.minutesLate);
    toCreate.push({
      employeeId: emp.id,
      branchId: emp.branchId,
      date,
      checkInAt,
      checkOutAt,
      minutesLate,
      status: deriveStatus(minutesLate),
      penaltyAmount: 0,
    });
  }

  // Bulk insert — skipDuplicates handles @@unique([employeeId, date]) conflicts
  let created = 0;
  let skipped = 0;
  if (toCreate.length > 0) {
    const result = await prisma.attendanceLog.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
    created = result.count;
    skipped = toCreate.length - result.count;
  }

  const uniqueUnmatched = unmatched.filter((v, i, a) => a.indexOf(v) === i);
  return NextResponse.json({
    created,
    skipped,
    unmatched: uniqueUnmatched,
    errors,
    total: records.length,
  });
}
