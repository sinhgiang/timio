import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeInScope } from "@/lib/branchScope";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.performanceReview.findFirst({ where: { id: params.id, companyId }, select: { employeeId: true } });
  if (!review) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!(await employeeInScope(user, review.employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  const { overallScore, selfScore, strengths, improvements, goals, status } = await req.json();

  await prisma.performanceReview.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(overallScore !== undefined && { overallScore: overallScore != null ? Number(overallScore) : null }),
      ...(selfScore !== undefined && { selfScore: selfScore != null ? Number(selfScore) : null }),
      ...(strengths !== undefined && { strengths: strengths || null }),
      ...(improvements !== undefined && { improvements: improvements || null }),
      ...(goals !== undefined && { goals: goals || null }),
      ...(status !== undefined && { status }),
      ...(status === "done" ? { reviewedBy: user?.email || null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const review = await prisma.performanceReview.findFirst({ where: { id: params.id, companyId }, select: { employeeId: true } });
  if (!review) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!(await employeeInScope(user, review.employeeId))) return NextResponse.json({ error: "Bạn chỉ được thao tác dữ liệu nhân viên chi nhánh mình." }, { status: 403 });

  await prisma.performanceReview.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
