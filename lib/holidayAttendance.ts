import { prisma } from "@/lib/prisma";
import { buildDayRows } from "@/lib/shiftResolve";

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
 * Ca gãy nhiều buổi/ngày (Employee.shiftOverride.sessions): dùng chung buildDayRows() (xem
 * lib/shiftResolve.ts, cũng là nguồn cho báo cáo Chi tiết trên ReportsClient.tsx) để ghi ĐỦ
 * từng buổi ("0","1",...) thay vì chỉ session "full" — nếu không, buổi thứ 2 trở đi vẫn bị
 * tính vắng dù buổi đầu đã lên "Nghỉ lễ". daysPresent chỉ cộng +1 CHO CẢ NGÀY (không phải +1
 * mỗi buổi), khớp quy ước isFirstLogOfDay đang dùng ở checkin/route.ts và checkin-face/route.ts.
 *
 * Nếu 1 buổi đã có chấm công thật (status khác "absent") thì buổi đó KHÔNG bị ghi đè — coi như
 * đã có mặt bình thường; đồng thời ngày đó cũng không cộng thêm daysPresent khống (buổi có mặt
 * thật đã tự cộng qua luồng check-in rồi). Idempotent — gọi lại nhiều lần an toàn.
 */
export async function markHolidayAttendance(employeeId: string, date: string, note: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { branchId: true, shiftOverride: true, branch: { select: { checkInTime: true, checkOutTime: true } } },
  });
  if (!employee) return;

  // 1 dòng "full" (NV bình thường) hoặc N dòng theo buổi (NV ca gãy) — xem lib/shiftResolve.ts
  const rows = buildDayRows(employee.shiftOverride, date);
  const ci = employee.branch.checkInTime || "08:00";
  const co = employee.branch.checkOutTime || "17:00";
  let alreadyPresent = false; // true nếu ÍT NHẤT 1 buổi trong ngày đã có chấm công thật

  for (const row of rows) {
    const existing = await prisma.attendanceLog.findUnique({
      where: { employeeId_date_session: { employeeId, date, session: row.session } },
    });
    if (existing && existing.status !== "absent") { alreadyPresent = true; continue; } // buổi này đã có mặt thật — không đụng vào

    // Gán sẵn checkInAt/checkOutAt theo giờ ca (buổi riêng nếu ca gãy, không thì giờ chuẩn chi
    // nhánh) — để log trông "đã khép ngày" (có checkOutAt) nên nếu nhân viên lỡ vẫn quét chấm
    // công buổi này, kiosk sẽ báo "đã chấm công đủ hôm nay" thay vì tính sai giờ/phạt ra sớm.
    const inHHMM = row.expectedCheckIn || ci;
    const outHHMM = row.expectedCheckOut || co;
    const checkInAt = new Date(`${date}T${inHHMM}:00+07:00`);
    const checkOutAt = new Date(`${date}T${outHHMM}:00+07:00`);

    if (existing) {
      await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: { status: "holiday", checkInAt, checkOutAt, minutesLate: 0, penaltyAmount: 0, note },
      });
    } else {
      await prisma.attendanceLog.create({
        data: {
          employeeId, branchId: employee.branchId, date, session: row.session,
          status: "holiday", checkInAt, checkOutAt, minutesLate: 0, penaltyAmount: 0, note,
        },
      });
    }
  }

  if (alreadyPresent) return; // ngày đã được tính có mặt thật ở buổi khác — không cộng thêm ngày công khống

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
 * Ngày lễ "flexible" (Nghỉ tự chọn) từ nay KHÔNG còn bắt sếp khai "Từ ngày"/"Đến ngày" nữa (theo
 * phản hồi user: chỉ cần Tên đợt + Tối đa/NV, NV tự chọn ngày phù hợp trong năm ở app riêng) —
 * nhưng Holiday.date trong DB vẫn required + unique theo (companyId, date). Hàm này chọn 1 "ngày
 * neo" nội bộ KHÔNG hiển thị cho sếp, chỉ dùng làm khoá + xác định năm áp dụng: ngày đầu tiên còn
 * trống trong năm đó (dò từ 01/01), tránh đụng ngày lễ cố định/đợt tự chọn khác đã có sẵn cùng
 * năm. Ranh giới ngày NV thực sự được chọn do /api/worker/holidays tính riêng (không dùng lại
 * date..endDate này), xem giải thích ở đó.
 */
export async function findFreeAnchorDate(companyId: string, year: number): Promise<string> {
  const used = new Set(
    (
      await prisma.holiday.findMany({
        where: { companyId, date: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
        select: { date: true },
      })
    ).map((h) => h.date)
  );
  for (let i = 0; i < 366; i++) {
    const d = new Date(Date.UTC(year, 0, 1 + i));
    if (d.getUTCFullYear() !== year) break; // hết năm (năm nhuận tối đa 366 ngày)
    const s = d.toISOString().slice(0, 10);
    if (!used.has(s)) return s;
  }
  return `${year}-12-31`; // cực hiếm: hết chỗ trống cả năm (>365 ngày lễ/đợt cùng công ty)
}

/**
 * Vá lỗ hổng: markHolidayAttendance ở app/api/holidays/route.ts CHỈ chạy cho các nhân viên đang
 * active TẠI THỜI ĐIỂM tạo/sửa "Ngày lễ cố định" — nhân viên tuyển SAU thời điểm đó sẽ không được
 * áp tự động, bị tính "Vắng" oan đúng ngày lễ (mất lương) dù công ty đã công bố nghỉ lễ từ trước.
 * Gọi hàm này ngay sau khi tạo 1 nhân viên mới (mọi nơi tạo NV: thêm tay, tuyển từ ứng viên, import
 * hàng loạt) để áp lại các ngày lễ cố định hiện có, tính từ ngày vào làm (hoặc từ hôm nay nếu không
 * có joinDate) trở đi — không đụng tới các ngày lễ đã qua trước khi NV vào làm.
 */
export async function backfillFixedHolidaysForNewEmployee(
  employeeId: string,
  companyId: string,
  joinDate: Date | null
): Promise<void> {
  const sinceDate = (joinDate ?? new Date()).toISOString().slice(0, 10);
  const holidays = await prisma.holiday.findMany({
    where: {
      companyId, mode: "fixed", penalizeLate: false,
      OR: [{ endDate: { gte: sinceDate } }, { endDate: null, date: { gte: sinceDate } }],
    },
    select: { date: true, endDate: true, name: true },
  });
  for (const h of holidays) {
    for (const d of dateRange(h.date, h.endDate || h.date)) {
      if (d >= sinceDate) await markHolidayAttendance(employeeId, d, `Nghỉ lễ: ${h.name}`);
    }
  }
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
  await prisma.attendanceLog.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });

  // markHolidayAttendance chỉ cộng +1 daysPresent CHO CẢ NGÀY (không phải mỗi buổi) — NV ca gãy
  // có thể có 2 dòng "holiday" cùng 1 ngày, nên gỡ cũng phải trừ đúng 1 lần/ngày, gộp theo
  // employeeId+date trước khi decrement, không phải theo từng dòng.
  const seenDay = new Set<string>();
  for (const row of rows) {
    const key = `${row.employeeId}|${row.date}`;
    if (seenDay.has(key)) continue;
    seenDay.add(key);
    const [y, m] = row.date.split("-").map(Number);
    await prisma.monthlySummary.updateMany({
      where: { employeeId: row.employeeId, year: y, month: m, daysPresent: { gt: 0 } },
      data: { daysPresent: { decrement: 1 } },
    });
  }
}
