import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — danh sách ứng viên được giới thiệu + nhân viên (để tạo link giới thiệu)
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);

  const referrals = await prisma.referral.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Nhân viên đang làm (để tạo link giới thiệu) — theo chi nhánh nếu là quản lý CN
  const employees = await prisma.employee.findMany({
    where: { companyId, status: "active", ...(b ? { branchId: b } : {}) },
    select: { id: true, name: true, code: true, department: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  // Thống kê theo người giới thiệu
  const byReferrer = new Map<string, { name: string; applied: number; hired: number; rewarded: number }>();
  for (const r of referrals) {
    const key = `${r.referrerType}:${r.referrerId}`;
    const cur = byReferrer.get(key) ?? { name: r.referrerName ?? "—", applied: 0, hired: 0, rewarded: 0 };
    cur.applied++;
    if (r.status === "hired") cur.hired++;
    if (r.status === "rewarded") { cur.hired++; cur.rewarded++; }
    byReferrer.set(key, cur);
  }

  return NextResponse.json({
    referrals,
    employees,
    leaderboard: Array.from(byReferrer.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.hired - a.hired || b.applied - a.applied),
  });
}
