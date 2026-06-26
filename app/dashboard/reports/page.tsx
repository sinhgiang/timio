import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";
import { canViewData, retentionLabel } from "@/lib/retention";
import PlanUpgradePage from "@/components/ui/PlanUpgradePage";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string; year?: string };
}) {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const scopedBranchId = u?.role === "manager" && u?.branchId ? u.branchId : null;

  const planRow = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, planExpires: true },
  });
  const plan = planRow?.plan ?? "starter";
  const planExpires = planRow?.planExpires ?? null;

  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);

  // Block access if this month falls outside the allowed retention window
  const requestedMonthStart = new Date(year, month - 1, 1);
  if (!canViewData(plan, planExpires, requestedMonthStart)) {
    const planExpired = plan !== "starter" && planExpires && planExpires < now;
    return (
      <PlanUpgradePage
        requiredPlan={plan === "starter" ? "pro" : "business"}
        feature={
          planExpired
            ? `Gói ${plan === "pro" ? "Pro" : "Business"} đã hết hạn`
            : `Dữ liệu tháng ${month}/${year} đã hết hạn lưu trữ`
        }
        description={
          planExpired
            ? `Gói của bạn đã hết hạn. Dữ liệu vẫn đang được giữ trong giai đoạn bảo lưu. Gia hạn ngay để truy cập lại toàn bộ lịch sử chấm công.`
            : `Gói ${plan === "starter" ? "Starter" : "Pro"} chỉ lưu dữ liệu trong ${retentionLabel(plan)} gần nhất. Dữ liệu tháng ${month}/${year} nằm ngoài khoảng thời gian này.`
        }
        bullets={
          plan === "starter"
            ? ["Gói Pro lưu tất cả dữ liệu khi còn trả phí", "Gói Business tương tự + báo cáo đa chi nhánh", "Nâng cấp để xem lại toàn bộ lịch sử"]
            : ["Gia hạn gói Pro để phục hồi dữ liệu ngay", "Dữ liệu được bảo lưu trong giai đoạn chờ", "Liên hệ hỗ trợ nếu cần lấy lại dữ liệu cũ"]
        }
      />
    );
  }

  const monthPad = String(month).padStart(2, "0");
  const empFilter = { companyId, status: "active", ...(scopedBranchId ? { branchId: scopedBranchId } : {}) };
  const empWhereNested = { companyId, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) };

  const [employees, logs, leaveRequests] = await Promise.all([
    prisma.employee.findMany({
      where: empFilter,
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        employee: empWhereNested,
        date: { gte: `${year}-${monthPad}-01`, lte: `${year}-${monthPad}-31` },
      },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: "approved",
        fromDate: { lte: `${year}-${monthPad}-31` },
        toDate: { gte: `${year}-${monthPad}-01` },
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      select: { employeeId: true, type: true, fromDate: true, toDate: true, days: true },
    }),
  ]);

  const [summaries, branches] = await Promise.all([
    prisma.monthlySummary.findMany({
      where: { employee: empWhereNested, year, month },
      include: { employee: true },
    }),
    prisma.branch.findMany({
      where: { companyId, ...(scopedBranchId ? { id: scopedBranchId } : {}) },
      orderBy: { name: "asc" },
    }),
  ]);

  const branchStats = branches.map((branch) => {
    const branchEmpIds = new Set(employees.filter((e) => e.branchId === branch.id).map((e) => e.id));
    const branchSummaries = summaries.filter((s) => branchEmpIds.has(s.employeeId));
    const branchEmps = employees.filter((e) => e.branchId === branch.id);
    return {
      branchId: branch.id,
      branchName: branch.name,
      employeeCount: branchEmps.length,
      daysPresent: branchSummaries.reduce((sum, s) => sum + s.daysPresent, 0),
      daysLate: branchSummaries.reduce((sum, s) => sum + s.daysLate, 0),
      daysAbsent: branchSummaries.reduce((sum, s) => sum + s.daysAbsent, 0),
      totalPenalty: branchSummaries.reduce((sum, s) => sum + s.totalPenalty, 0),
      totalOvertimeAmount: branchSummaries.reduce((sum, s) => sum + s.totalOvertimeAmount, 0),
      totalBaseSalary: branchEmps.reduce((sum, e) => sum + (e.baseSalary ?? 0), 0),
    };
  });

  return (
    <ReportsClient
      leaveRequests={leaveRequests}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        department: e.department,
        branchName: e.branch.name,
        baseSalary: e.baseSalary ?? 0,
      }))}
      logs={logs.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        date: l.date,
        checkInAt: l.checkInAt?.toISOString() ?? null,
        checkOutAt: l.checkOutAt?.toISOString() ?? null,
        minutesLate: l.minutesLate,
        minutesOvertime: l.minutesOvertime,
        status: l.status,
        penaltyAmount: l.penaltyAmount,
        overtimeAmount: l.overtimeAmount,
        overtimeStatus: l.overtimeStatus,
        note: l.note ?? null,
      }))}
      summaries={summaries.map((s) => ({
        employeeId: s.employeeId,
        employeeName: s.employee.name,
        daysPresent: s.daysPresent,
        daysLate: s.daysLate,
        daysAbsent: s.daysAbsent,
        totalMinutesLate: s.totalMinutesLate,
        totalPenalty: s.totalPenalty,
        totalReward: s.totalReward,
        totalMinutesOvertime: s.totalMinutesOvertime,
        totalOvertimeAmount: s.totalOvertimeAmount,
      }))}
      branchStats={branchStats}
      year={year}
      month={month}
    />
  );
}
