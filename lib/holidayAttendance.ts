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
