import { prisma } from "@/lib/prisma";

export interface TalentStats {
  vAttendance: number | null;   // % chuyên cần
  vPunctuality: number | null;  // % đúng giờ
  vTenureMonths: number | null; // thâm niên (tháng)
  vScore: number | null;        // điểm tin cậy 0-100
  enough: boolean;              // đủ dữ liệu để xác thực không
  sampleSize: number;           // số bản ghi chấm công dùng để tính
}

const MIN_SAMPLES = 20; // cần ít nhất 20 lần chấm công để xác thực (tránh bịa)

/**
 * Tính chỉ số xác thực + điểm tin cậy Timio cho 1 nhân viên từ toàn bộ lịch sử chấm công.
 * Snapshot dùng khi cựu nhân viên rời công ty.
 */
export async function computeTalentStats(employeeId: string): Promise<TalentStats> {
  const [logs, emp] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: { employeeId },
      select: { checkInAt: true, minutesLate: true },
    }),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { joinDate: true } }),
  ]);

  const total = logs.length;
  const present = logs.filter((l) => l.checkInAt !== null).length;
  const onTime = logs.filter((l) => l.checkInAt !== null && l.minutesLate <= 0).length;

  const enough = total >= MIN_SAMPLES && present > 0;

  const vAttendance = total > 0 ? Math.round((present / total) * 100) : null;
  const vPunctuality = present > 0 ? Math.round((onTime / present) * 100) : null;

  let vTenureMonths: number | null = null;
  if (emp?.joinDate) {
    const months = (Date.now() - emp.joinDate.getTime()) / (30 * 86400000);
    vTenureMonths = Math.max(0, Math.round(months));
  }

  let vScore: number | null = null;
  if (enough && vAttendance !== null && vPunctuality !== null) {
    const tenureScore = vTenureMonths != null ? Math.min(100, (vTenureMonths / 24) * 100) : 50;
    vScore = Math.round(0.5 * vAttendance + 0.35 * vPunctuality + 0.15 * tenureScore);
    if (vScore > 100) vScore = 100;
    if (vScore < 0) vScore = 0;
  }

  return { vAttendance, vPunctuality, vTenureMonths, vScore, enough, sampleSize: total };
}
