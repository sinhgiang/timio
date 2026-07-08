import { prisma } from "@/lib/prisma";

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

export interface WorkerProfile {
  handle: string | null;
  name: string;
  avatarUrl: string | null;
  role: string;
  department: string | null;
  companyName: string | null;
  location: string;
  tags: string[];
  socials: { phone: string | null; email: string | null; zalo: string | null; facebook: string | null };
  verified: { experienceMonths: number; totalDaysWorked: number; punctualityRate: number | null; companiesCount: number };
  experiences: { companyName: string; position: string; department: string | null; branchName: string | null; joinDate: string | null; active: boolean; monthsHere: number | null }[];
}

// Tính hồ sơ nghề nghiệp + thống kê ĐƯỢC XÁC THỰC từ dữ liệu chấm công. Trả null nếu không có tài khoản.
export async function computeWorkerProfile(workerAccountId: string): Promise<WorkerProfile | null> {
  const wa = await prisma.workerAccount.findUnique({
    where: { id: workerAccountId },
    select: { name: true, phone: true, email: true, avatarUrl: true, handle: true },
  });
  if (!wa) return null;

  const employees = await prisma.employee.findMany({
    where: { workerAccountId },
    select: {
      id: true, position: true, department: true, status: true,
      joinDate: true, avatarUrl: true, zalo: true, facebook: true, email: true, phone: true,
      company: { select: { name: true } },
      branch: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const now = new Date();
  const empIds = employees.map((e) => e.id);

  let totalDaysWorked = 0, onTimeDays = 0;
  if (empIds.length) {
    const [total, onTime] = await Promise.all([
      prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null } } }),
      prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 } }),
    ]);
    totalDaysWorked = total; onTimeDays = onTime;
  }
  const punctualityRate = totalDaysWorked > 0 ? Math.round((onTimeDays / totalDaysWorked) * 100) : null;

  const joinDates = employees.map((e) => e.joinDate).filter((d): d is Date => !!d);
  let earliest: Date | null = joinDates.length ? new Date(Math.min(...joinDates.map((d) => d.getTime()))) : null;
  if (!earliest && empIds.length) {
    const first = await prisma.attendanceLog.findFirst({
      where: { employeeId: { in: empIds }, checkInAt: { not: null } },
      orderBy: { date: "asc" }, select: { date: true },
    });
    if (first?.date) earliest = new Date(first.date);
  }
  const experienceMonths = earliest ? monthsBetween(earliest, now) : 0;

  const primary = employees.find((e) => e.status === "active") ?? employees[0] ?? null;

  const experiences = employees.map((e) => ({
    companyName: e.company?.name ?? "Công ty",
    position: e.position || "Nhân viên",
    department: e.department,
    branchName: e.branch?.name ?? null,
    joinDate: e.joinDate ? e.joinDate.toISOString() : null,
    active: e.status === "active",
    monthsHere: e.joinDate ? monthsBetween(e.joinDate, now) : null,
  }));

  const tagSet = new Set<string>();
  for (const e of employees) {
    if (e.position) tagSet.add(e.position);
    if (e.department) tagSet.add(e.department);
  }

  return {
    handle: wa.handle,
    name: wa.name,
    avatarUrl: wa.avatarUrl || primary?.avatarUrl || null,
    role: primary?.position || "Nhân viên",
    department: primary?.department || null,
    companyName: primary?.company?.name ?? null,
    location: primary?.branch?.name || primary?.company?.name || "Việt Nam",
    tags: Array.from(tagSet).slice(0, 6),
    socials: {
      phone: primary?.phone || wa.phone || null,
      email: primary?.email || wa.email || null,
      zalo: primary?.zalo || null,
      facebook: primary?.facebook || null,
    },
    verified: {
      experienceMonths, totalDaysWorked, punctualityRate,
      companiesCount: new Set(employees.map((e) => e.company?.name)).size,
    },
    experiences,
  };
}
