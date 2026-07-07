import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Gom "đầu việc cần xử lý" cho chuông thông báo — theo vai trò + chi nhánh
export async function GET() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return NextResponse.json({ total: 0, items: [] });

  const role = u?.role ?? "owner";
  // Quản lý / kế toán có gán chi nhánh → chỉ đếm chi nhánh mình
  const branchId = (role === "manager" || role === "accountant") && u?.branchId ? u.branchId : null;
  const empWhere = branchId ? { employee: { companyId, branchId } } : { employee: { companyId } };

  type Item = { key: string; label: string; count: number; href: string };
  const jobs: Promise<Item | null>[] = [];

  const push = (key: string, label: string, href: string, p: Promise<number>) => {
    jobs.push(p.then((count) => (count > 0 ? { key, label, count, href } : null)).catch(() => null));
  };

  const isManage = role === "owner" || role === "manager";
  const isFinance = role === "owner" || role === "accountant";

  if (isManage) {
    // Ứng viên mới (scope theo chi nhánh của job)
    const candWhere = branchId
      ? { companyId, status: "new", job: { OR: [{ branchId }, { branchId: null }] } }
      : { companyId, status: "new" };
    push("candidates", "ứng viên mới", "/dashboard/recruitment", prisma.candidate.count({ where: candWhere }));

    push("leave", "đơn nghỉ phép chờ duyệt", "/dashboard/leave",
      prisma.leaveRequest.count({ where: { companyId, status: "pending", ...(branchId ? { employee: { branchId } } : {}) } }));
    push("corrections", "yêu cầu sửa chấm công", "/dashboard/corrections",
      prisma.correctionRequest.count({ where: { status: "pending", ...empWhere } }));
    push("overtime", "đơn tăng ca chờ duyệt", "/dashboard/overtime-requests",
      prisma.overtimeRequest.count({ where: { companyId, status: "pending", ...(branchId ? { employee: { branchId } } : {}) } }));
    push("earlyleave", "đơn về sớm chờ duyệt", "/dashboard/early-leave-requests",
      prisma.earlyLeaveRequest.count({ where: { companyId, status: "pending", ...(branchId ? { employee: { branchId } } : {}) } }));
    push("shiftswap", "yêu cầu đổi ca", "/dashboard/shift-swap-requests",
      prisma.shiftSwapRequest.count({ where: { companyId, status: "pending", ...(branchId ? { requester: { branchId } } : {}) } }));
  }

  if (isFinance) {
    push("advances", "đơn tạm ứng lương", "/dashboard/salary-advances",
      prisma.salaryAdvance.count({ where: { companyId, status: "pending", ...(branchId ? { employee: { branchId } } : {}) } }));
    push("expenses", "chi phí công tác chờ duyệt", "/dashboard/expenses",
      prisma.expenseClaim.count({ where: { companyId, status: "pending", ...(branchId ? { employee: { branchId } } : {}) } }));
  }

  const resolved = (await Promise.all(jobs)).filter((x): x is Item => x !== null);
  const total = resolved.reduce((s, i) => s + i.count, 0);
  return NextResponse.json({ total, items: resolved });
}
