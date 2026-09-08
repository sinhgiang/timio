import { prisma } from "@/lib/prisma";

/**
 * Đánh dấu 1 ngày là "nghỉ lễ ĐÃ ĐƯỢC DUYỆT" cho 1 nhân viên: KHÔNG tính vắng, KHÔNG trừ lương.
 *
 * Vì sao cần hàm riêng: điều tra thực tế cho thấy hệ thống hiện KHÔNG có bất kỳ liên kết nào
 * giữa LeaveRequest/Holiday đã duyệt với AttendanceLog/MonthlySummary — nhân viên nghỉ lễ đã
 * duyệt mà không chấm công thì vẫn bị tính như vắng mặt tự ý (không có log -> daysPresent
 * không tăng -> earnedBase = baseSalary/standardWorkDays*daysPresent bị giảm y hệt như vắng
 * không phép). Hàm này lấp đúng lỗ hổng đó cho ngày lễ: ghi AttendanceLog với status="holiday"
 * (khác hẳn "absent" — để mọi nơi đọc log đều nhận biết RÕ RÀNG đây là nghỉ lễ đã duyệt, không
 * phải tự ý nghỉ) và cộng thẳng vào MonthlySummary.daysPresent (đúng cơ chế daysPresent đang
 * dùng để tính lương ở checkin/route.ts — xem lib/attendance.ts investigation).
 *
 * Nếu ngày đó nhân viên đã có chấm công thật (status khác "absent") thì KHÔNG ghi đè — họ đã
 * được tính có mặt bình thường rồi, không cần can thiệp (idempotent — gọi lại nhiều lần an toàn).
 *
 * Giới hạn đã biết: chỉ ghi vào session "full" — nhân viên ca gãy nhiều buổi/ngày
 * (Employee.shiftOverride.sessions) sẽ cần can thiệp riêng cho từng buổi, chưa xử lý ở đây.
 */
export async function markHolidayAttendance(employeeId: string, date: string, note: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { branchId: true, branch: { select: { checkInTime: true, checkOutTime: true } } },
  });
  if (!employee) return;

  const existing = await prisma.attendanceLog.findUnique({
    where: { employeeId_date_session: { employeeId, date, session: "full" } },
  });
  if (existing && existing.status !== "absent") return; // đã có mặt thật (checkin/correction) — không đụng vào

  // Gán sẵn checkInAt/checkOutAt theo giờ ca chuẩn của chi nhánh — để log trông "đã khép ngày"
  // (có checkOutAt) nên nếu nhân viên lỡ vẫn quét chấm công ngày này, kiosk sẽ báo "đã chấm công
  // đủ hôm nay" thay vì hiểu nhầm thao tác đó là check-out và tính sai giờ/phạt ra sớm.
  const ci = employee.branch.checkInTime || "08:00";
  const co = employee.branch.checkOutTime || "17:00";
  const checkInAt = new Date(`${date}T${ci}:00+07:00`);
  const checkOutAt = new Date(`${date}T${co}:00+07:00`);

  if (existing) {
    await prisma.attendanceLog.update({
      where: { id: existing.id },
      data: { status: "holiday", checkInAt, checkOutAt, minutesLate: 0, penaltyAmount: 0, note },
    });
  } else {
    await prisma.attendanceLog.create({
      data: {
        employeeId, branchId: employee.branchId, date, session: "full",
        status: "holiday", checkInAt, checkOutAt, minutesLate: 0, penaltyAmount: 0, note,
      },
    });
  }

  const [y, m] = date.split("-").map(Number);
  await prisma.monthlySummary.upsert({
    where: { employeeId_year_month: { employeeId, year: y, month: m } },
    create: { employeeId, year: y, month: m, daysPresent: 1 },
    update: { daysPresent: { increment: 1 } },
  });
}

/** Liệt kê các ngày YYYY-MM-DD liên tục từ from đến to (bao gồm 2 đầu). Giới hạn 62 ngày để tránh vòng lặp vô hạn nếu dữ liệu sai. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  for (let i = 0; i < 62 && cur <= to; i++) {
    out.push(cur);
    const d = new Date(`${cur}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return out;
}

/**
 * Tìm ngày lễ (nếu có) của công ty mà `date` rơi vào trong khoảng [date, endDate || date] của nó.
 * Dùng CHUNG cho mọi nơi cần biết "hôm nay có phải ngày lễ không" (chấm công, nhắc trễ...) —
 * thay cho so khớp đúng 1 ngày (`date: today`) trước đây, vốn CHỈ đúng với ngày lễ 1 ngày. Từ khi
 * ngày lễ có thể là 1 khoảng (endDate, mode "fixed"), so khớp đúng 1 ngày sẽ bỏ sót mọi ngày sau
 * ngày bắt đầu trong khoảng — vd lễ 2 ngày 02-03/9 chỉ được nhận diện đúng ngày 02, ngày 03 bị coi
 * như ngày thường (mất miễn phạt trễ / mất bỏ qua nhắc trễ).
 */
export async function findHolidayForDate(
  companyId: string,
  date: string
): Promise<{ name: string; penalizeLate: boolean } | null> {
  return prisma.holiday.findFirst({
    where: {
      companyId,
      date: { lte: date },
      OR: [{ endDate: { gte: date } }, { endDate: null, date }],
    },
    select: { name: true, penalizeLate: true },
  });
}

/**
 * Gỡ toàn bộ log "nghỉ lễ tự động" (status="holiday", do markHolidayAttendance tạo — giá trị này
 * KHÔNG do bất kỳ luồng chấm công thật nào ghi, nên gặp là chắc chắn của hàm này) cho các ngày chỉ
 * định trong công ty. Dùng khi:
 * - Sửa/xoá 1 "Ngày lễ cố định": dọn log cũ trước khi áp lại theo cấu hình mới, tránh sót ngày
 *   công ảo (daysPresent cộng khống) hoặc log giả khiến kiosk từ chối chấm công thật ("đã chấm
 *   công đủ hôm nay") trên ngày lẽ ra không còn là lễ nữa.
 * - Bật lại "vẫn tính muộn/phạt" (penalizeLate=true) cho ngày lễ đang mở toàn công ty đi làm bình
 *   thường: log giả (đã tự điền checkInAt/checkOutAt) đang chặn nhân viên quét chấm công thật.
 */
export async function revertHolidayAttendanceRange(companyId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const rows = await prisma.attendanceLog.findMany({
    where: { date: { in: dates }, status: "holiday", employee: { companyId } },
    select: { id: true, employeeId: true, date: true },
  });
  for (const row of rows) {
    await prisma.attendanceLog.delete({ where: { id: row.id } });
    const [y, m] = row.date.split("-").map(Number);
    await prisma.monthlySummary.updateMany({
      where: { employeeId: row.employeeId, year: y, month: m, daysPresent: { gt: 0 } },
      data: { daysPresent: { decrement: 1 } },
    });
  }
}
