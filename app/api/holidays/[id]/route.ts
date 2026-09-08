import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markHolidayAttendance, dateRange, revertHolidayAttendanceRange } from "@/lib/holidayAttendance";

// Sửa 1 ngày lễ ĐÃ TẠO tại chỗ (theo id) — thay vì bắt sếp phải Xóa rồi Thêm lại từ đầu. Cập
// nhật BẰNG id (khác với POST /api/holidays vốn upsert theo `date`) để xử lý được cả trường hợp
// sếp đổi luôn "Từ ngày": upsert-theo-date sẽ tạo record MỚI và để sót record cũ mồ côi trong DB.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.holiday.findFirst({ where: { id: params.id, companyId } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy ngày lễ" }, { status: 404 });

  const body = await req.json();
  const {
    date, name, isNational = false, penalizeLate = false,
    mode = "fixed", endDate = null, totalDays = null, maxDays = null,
  } = body;
  if (!date || !name) return NextResponse.json({ error: "Thiếu ngày hoặc tên" }, { status: 400 });
  if (mode !== "fixed" && mode !== "flexible") {
    return NextResponse.json({ error: "Chế độ không hợp lệ" }, { status: 400 });
  }
  if (endDate && endDate < date) {
    return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
  }

  // Đổi "Từ ngày" sang trùng 1 ngày lễ KHÁC đã có sẵn → báo lỗi rõ ràng thay vì để lỗi unique
  // constraint (P2002) chung chung văng ra tới người dùng.
  if (date !== existing.date) {
    const clash = await prisma.holiday.findUnique({ where: { companyId_date: { companyId, date } } });
    if (clash && clash.id !== existing.id) {
      return NextResponse.json({ error: `Đã có ngày lễ khác bắt đầu ngày ${date} ("${clash.name}"). Chọn ngày khác hoặc xóa ngày lễ kia trước.` }, { status: 409 });
    }
  }

  let holiday;
  try {
    holiday = await prisma.holiday.update({
      where: { id: existing.id },
      data: {
        date, name, isNational, penalizeLate: Boolean(penalizeLate),
        mode, endDate: endDate || null,
        totalDays: totalDays != null && totalDays !== "" ? Number(totalDays) : null,
        maxDays: maxDays != null && maxDays !== "" ? Number(maxDays) : null,
      },
    });
  } catch (err: unknown) {
    const isUnique = typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
    return NextResponse.json({ error: isUnique ? `Đã có ngày lễ khác trùng ngày ${date}.` : "Lỗi lưu" }, { status: isUnique ? 409 : 500 });
  }

  // Dọn log "nghỉ lễ tự động" của khoảng ngày CŨ trước khi áp lại — giống hệt POST /api/holidays,
  // để sửa ngày/mode/bật lại phạt không để sót ngày công ảo hay log giả (xem revertHolidayAttendanceRange).
  await revertHolidayAttendanceRange(companyId, dateRange(existing.date, existing.endDate || existing.date));

  if (mode === "fixed" && !penalizeLate) {
    const dates = dateRange(date, endDate || date);
    const activeEmployees = await prisma.employee.findMany({ where: { companyId, status: "active" }, select: { id: true } });
    for (const emp of activeEmployees) {
      for (const d of dates) {
        await markHolidayAttendance(emp.id, d, `Nghỉ lễ: ${name}`);
      }
    }
  }

  return NextResponse.json(holiday);
}

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
