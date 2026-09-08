import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateRange, revertHolidayAttendanceRange } from "@/lib/holidayAttendance";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Xoá ngày lễ "cố định" (mode=fixed) phải dọn luôn log "nghỉ lễ tự động" đã ghi cho cả công ty
  // khi tạo/lưu ngày lễ đó — nếu không, xoá nhầm/xoá để tạo lại sẽ để lại ngày công ảo (daysPresent
  // cộng khống, không bị trừ lương dù ngày lễ đã không còn tồn tại) và log giả tiếp tục chặn chấm
  // công thật những ngày đó. Xem lib/holidayAttendance.ts revertHolidayAttendanceRange.
  const holiday = await prisma.holiday.findFirst({ where: { id: params.id, companyId } });
  if (holiday?.mode === "fixed") {
    await revertHolidayAttendanceRange(companyId, dateRange(holiday.date, holiday.endDate || holiday.date));
  }

  await prisma.holiday.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
