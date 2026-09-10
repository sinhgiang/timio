// Lịch làm việc CẢ THÁNG của 1 nhân viên (dùng cho tab "Lịch ca" ở /ho-so) — hàm THUẦN (không
// đụng DB), nhận sẵn dữ liệu đã truy vấn từ route để test được. Với MỖI ngày trong tháng, xác
// định "đi làm hay nghỉ" + giờ dự kiến, theo ĐÚNG thứ tự ưu tiên đã dùng khi tính chấm công thật
// (xem app/api/attendance/checkin*/route.ts, lib/shiftResolve.ts):
//   Nghỉ phép đã duyệt > Ngày lễ cố định (toàn công ty) > Ngày làm khác (dayOverrides, theo thứ)
//   > Lịch phân ca (ShiftAssignment, đúng ngày) > Ca gãy/giờ riêng NV (theo lịch tuần workDays)
//   > Mặc định chi nhánh (theo lịch tuần workDays).
// Ngày lễ "vẫn tính muộn" (penalizeLate=true) KHÔNG được coi là nghỉ ở đây (đơn giản hoá có chủ
// đích — xem ghi chú ở route) nên không xuất hiện trong fixedHolidaysByDate.
import { findDayOverride, parseShiftSessions, dateStringToVNInstant } from "./shiftResolve";

export interface MonthDaySession {
  label: string | null; // "Sáng"/"Tối" (ca gãy) hoặc tên ca ở Lịch phân ca — null nếu ca giờ đơn thường
  checkIn: string; // HH:MM
  checkOut: string; // HH:MM
}

export type MonthDaySource =
  | "leave" // Nghỉ phép / nghỉ lễ tự chọn đã duyệt
  | "holiday" // Ngày lễ cố định toàn công ty
  | "day_override" // Ngày làm khác (Employee.shiftOverride.dayOverrides)
  | "roster" // Lịch phân ca (ShiftAssignment) đúng ngày
  | "weekly_shift" // Ca gãy/giờ riêng NV theo lịch tuần (workDays)
  | "weekly_rest"; // Ngày nghỉ hàng tuần mặc định (không phải ngày làm theo workDays)

export interface MonthDayEntry {
  date: string; // YYYY-MM-DD
  isWorkDay: boolean;
  offLabel: string | null; // set khi isWorkDay=false, vd "Nghỉ phép năm", "Nghỉ lễ: Quốc khánh"
  source: MonthDaySource;
  sessions: MonthDaySession[]; // rỗng khi isWorkDay=false
}

export function buildMonthSchedule(params: {
  year: number;
  month: number; // 1-12
  branch: { workDays: string; checkInTime: string; checkOutTime: string };
  shiftOverrideRaw: string | null;
  assignmentsByDate: Map<string, { shiftLabel: string; checkIn: string; checkOut: string }[]>;
  fixedHolidaysByDate: Map<string, string>; // date -> tên ngày lễ
  leaveByDate: Map<string, string>; // date -> nhãn nghỉ (vd "Nghỉ phép năm")
}): MonthDayEntry[] {
  const { year, month, branch, shiftOverrideRaw, assignmentsByDate, fixedHolidaysByDate, leaveByDate } = params;

  let ov: { checkInTime?: string; checkOutTime?: string; workDays?: string } = {};
  try {
    ov = shiftOverrideRaw ? JSON.parse(shiftOverrideRaw) : {};
  } catch {
    ov = {};
  }
  const workDaySet = new Set((ov.workDays ?? branch.workDays).split(",").map((s) => s.trim()));
  const sessions = parseShiftSessions(shiftOverrideRaw);

  const daysInMonth = new Date(year, month, 0).getDate();
  const out: MonthDayEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const leaveLabel = leaveByDate.get(dateStr);
    if (leaveLabel) {
      out.push({ date: dateStr, isWorkDay: false, offLabel: leaveLabel, source: "leave", sessions: [] });
      continue;
    }

    const holidayName = fixedHolidaysByDate.get(dateStr);
    if (holidayName) {
      out.push({ date: dateStr, isWorkDay: false, offLabel: `Nghỉ lễ: ${holidayName}`, source: "holiday", sessions: [] });
      continue;
    }

    const dayOverride = findDayOverride(shiftOverrideRaw, dateStringToVNInstant(dateStr));
    if (dayOverride) {
      out.push({
        date: dateStr, isWorkDay: true, offLabel: null, source: "day_override",
        sessions: [{ label: null, checkIn: dayOverride.checkInTime, checkOut: dayOverride.checkOutTime }],
      });
      continue;
    }

    const assignments = assignmentsByDate.get(dateStr);
    if (assignments && assignments.length > 0) {
      const work = assignments.filter((a) => a.shiftLabel !== "Nghỉ");
      if (work.length === 0) {
        out.push({ date: dateStr, isWorkDay: false, offLabel: "Nghỉ (theo lịch phân ca)", source: "roster", sessions: [] });
      } else {
        out.push({
          date: dateStr, isWorkDay: true, offLabel: null, source: "roster",
          sessions: work.map((a) => ({ label: a.shiftLabel, checkIn: a.checkIn, checkOut: a.checkOut })),
        });
      }
      continue;
    }

    // Không có gì đặc biệt cho ngày này → theo lịch tuần (workDays của NV, không thì của chi nhánh).
    // LƯU Ý: workDays lưu theo chuẩn JS Date.getDay() — 0=CN..6=T7 (xem EmployeesClient.tsx DAYS[]
    // và lib/shiftResolve.ts findDayOverride) — KHÔNG phải ISO (1=T2..7=CN). Trước đây quy đổi
    // sang ISO ở đây khiến workDaySet.has("7") luôn false dù có "0" (CN) trong set → Chủ nhật bị
    // ép thành "Nghỉ hàng tuần" ngay cả khi NV được cấu hình làm việc Chủ nhật.
    const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=CN..6=T7
    if (!workDaySet.has(String(jsDay))) {
      out.push({ date: dateStr, isWorkDay: false, offLabel: "Nghỉ hàng tuần", source: "weekly_rest", sessions: [] });
      continue;
    }

    if (sessions) {
      out.push({
        date: dateStr, isWorkDay: true, offLabel: null, source: "weekly_shift",
        sessions: sessions.map((s) => ({ label: s.label, checkIn: s.checkInTime, checkOut: s.checkOutTime })),
      });
    } else {
      out.push({
        date: dateStr, isWorkDay: true, offLabel: null, source: "weekly_shift",
        sessions: [{ label: null, checkIn: ov.checkInTime ?? branch.checkInTime, checkOut: ov.checkOutTime ?? branch.checkOutTime }],
      });
    }
  }

  return out;
}
