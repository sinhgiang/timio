import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function monthsBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()));
}

// GET — hồ sơ nghề nghiệp của nhân viên + thống kê ĐƯỢC XÁC THỰC từ dữ liệu chấm công
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const wa = await prisma.workerAccount.findUnique({
    where: { id },
    select: { name: true, phone: true, email: true, avatarUrl: true },
  });
  if (!wa) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id },
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

  // Thống kê chấm công (toàn thời gian) — bằng chứng "được xác thực"
  let totalDaysWorked = 0, onTimeDays = 0;
  if (empIds.length) {
    const [total, onTime] = await Promise.all([
      prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null } } }),
      prisma.attendanceLog.count({ where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 } }),
    ]);
    totalDaysWorked = total;
    onTimeDays = onTime;
  }
  const punctualityRate = totalDaysWorked > 0 ? Math.round((onTimeDays / totalDaysWorked) * 100) : null;

  // Kinh nghiệm: từ ngày vào làm sớm nhất (fallback: ngày chấm công sớm nhất)
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

  // Nơi làm chính = nơi active gần nhất (nếu không có, lấy đầu danh sách)
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

  // Thẻ kỹ năng/chuyên môn suy từ chức vụ + phòng ban (loại trùng)
  const tagSet = new Set<string>();
  for (const e of employees) {
    if (e.position) tagSet.add(e.position);
    if (e.department) tagSet.add(e.department);
  }
  const tags = Array.from(tagSet).slice(0, 6);

  return NextResponse.json({
    name: wa.name,
    avatarUrl: wa.avatarUrl || primary?.avatarUrl || null,
    role: primary?.position || "Nhân viên",
    department: primary?.department || null,
    companyName: primary?.company?.name ?? null,
    location: primary?.branch?.name || primary?.company?.name || "Việt Nam",
    tags,
    socials: {
      phone: primary?.phone || wa.phone || null,
      email: primary?.email || wa.email || null,
      zalo: primary?.zalo || null,
      facebook: primary?.facebook || null,
    },
    verified: {
      experienceMonths,
      totalDaysWorked,
      punctualityRate,
      companiesCount: new Set(employees.map((e) => e.company?.name)).size,
    },
    experiences,
  });
}
