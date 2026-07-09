import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OvertimeClient from "./OvertimeClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tăng ca" };

export default async function OvertimePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) redirect("/login");

  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  const [logs, requests] = await Promise.all([
    prisma.attendanceLog.findMany({
      where: {
        minutesOvertime: { gt: 0 },
        overtimeStatus: { in: ["pending", "approved", "rejected"] },
        employee: { companyId: user.companyId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
      },
      select: {
        id: true, date: true, checkInAt: true, checkOutAt: true,
        minutesOvertime: true, overtimeAmount: true, overtimeStatus: true,
        employee: { select: { id: true, name: true, code: true, department: true, branch: { select: { name: true } } } },
      },
      orderBy: [{ date: "desc" }],
    }),
    prisma.overtimeRequest.findMany({
      where: { companyId: user.companyId, ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}) },
      select: {
        id: true, date: true, startTime: true, endTime: true, hours: true, reason: true, status: true,
        employee: { select: { id: true, name: true, code: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Ghép ĐƠN XIN vào bản ghi tăng ca thực tế theo (nhân viên + ngày) để hiện lý do ngay trên dòng.
  const reqByKey = new Map<string, { reason: string | null; hours: number; startTime: string; endTime: string }>();
  for (const r of requests) reqByKey.set(`${r.employee.id}|${r.date}`, { reason: r.reason, hours: r.hours, startTime: r.startTime, endTime: r.endTime });

  const logKeys = new Set(logs.map((l) => `${l.employee.id}|${l.date}`));
  const enrichedLogs = logs.map((l) => ({ ...l, request: reqByKey.get(`${l.employee.id}|${l.date}`) ?? null }));

  // Đơn xin CHƯA phát sinh giờ làm thực tế (chưa có bản ghi tăng ca) → nhóm riêng "đăng ký trước"
  const advanceRequests = requests
    .filter((r) => r.status === "pending" && !logKeys.has(`${r.employee.id}|${r.date}`))
    .map((r) => ({ id: r.id, date: r.date, startTime: r.startTime, endTime: r.endTime, hours: r.hours, reason: r.reason, employee: r.employee }));

  return <OvertimeClient logs={JSON.parse(JSON.stringify(enrichedLogs))} advanceRequests={JSON.parse(JSON.stringify(advanceRequests))} />;
}
