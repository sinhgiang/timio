import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeaveClient from "./LeaveClient";
import PlanUpgradePage from "@/components/ui/PlanUpgradePage";

export default async function LeavePage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const scopedBranchId = u?.role === "manager" && u?.branchId ? u.branchId : null;

  const planRow = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (!planRow || planRow.plan === "starter") {
    return (
      <PlanUpgradePage
        requiredPlan="pro"
        feature="Quản lý nghỉ phép"
        description="Nhân viên xin nghỉ ngay tại kiosk bằng nhận diện khuôn mặt. Admin phê duyệt trên điện thoại và in phiếu nghỉ phép A4 chuyên nghiệp."
        bullets={[
          "Kiosk xin nghỉ phép có xác thực khuôn mặt",
          "5 loại phép: năm / ốm / không lương / thai sản / khác",
          "Phê duyệt hoặc từ chối ngay trên dashboard",
          "Bàn giao công việc tự động trước khi nghỉ",
          "Tự động trừ số ngày phép còn lại",
        ]}
      />
    );
  }

  const [company, requests] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, signatureUrl: true, stampUrl: true },
    }),
    prisma.leaveRequest.findMany({
      where: { companyId, ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}) },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            position: true,
            phone: true,
            dateOfBirth: true,
            annualLeaveBalance: true,
            baseSalary: true,
            branch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <LeaveClient
      company={{
        name: company?.name ?? "",
        slug: company?.slug ?? "",
        signatureUrl: company?.signatureUrl ?? null,
        stampUrl: company?.stampUrl ?? null,
      }}
      requests={await Promise.all(requests.map(async (r) => {
        let handoverEmployeeName: string | null = null;
        if (r.handoverEmployeeId) {
          const he = await prisma.employee.findUnique({
            where: { id: r.handoverEmployeeId },
            select: { name: true, code: true },
          });
          handoverEmployeeName = he ? `${he.name} (${he.code})` : null;
        }
        return {
          id: r.id,
          type: r.type as "annual" | "sick" | "unpaid" | "maternity" | "other",
          fromDate: r.fromDate,
          toDate: r.toDate,
          days: r.days,
          reason: r.reason,
          status: r.status as "pending" | "approved" | "rejected",
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          employeeSignature: r.employeeSignature ?? null,
          handoverEmployeeId: r.handoverEmployeeId ?? null,
          handoverEmployeeName,
          handoverConfirmedAt: r.handoverConfirmedAt?.toISOString() ?? null,
          employee: {
            id: r.employee.id,
            name: r.employee.name,
            code: r.employee.code,
            department: r.employee.department,
            position: r.employee.position ?? null,
            phone: r.employee.phone ?? null,
            dateOfBirth: r.employee.dateOfBirth ?? null,
            annualLeaveBalance: r.employee.annualLeaveBalance,
            baseSalary: r.employee.baseSalary ?? 0,
            branch: { name: r.employee.branch.name },
          },
        };
      }))}
    />
  );
}
