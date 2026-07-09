import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

// Kiểm tra job có thuộc phạm vi (công ty + chi nhánh của manager) không
async function jobInScope(user: ScopeUser, id: string): Promise<boolean> {
  const b = scopedBranchId(user);
  const job = await prisma.jobPosting.findFirst({
    where: { id, companyId: user.companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    select: { id: true },
  });
  return !!job;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  if (!(await jobInScope(user!, params.id))) return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền" }, { status: 404 });

  const { title, department, location, description, requirements, salaryMin, salaryMax, status,
    branchId, quantity, workTime, benefits, isPublic, criteria, tags } = await req.json();
  const criteriaJson = criteria !== undefined
    ? (Array.isArray(criteria) ? JSON.stringify(criteria.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 8)) : null)
    : undefined;
  const tagsStr = tags !== undefined
    ? (typeof tags === "string" ? (Array.from(new Set(tags.split(",").map((t: string) => t.trim().replace(/^#+/, "").slice(0, 40)).filter(Boolean))).slice(0, 12).join(", ") || null) : null)
    : undefined;

  // Manager chi nhánh không được chuyển job sang chi nhánh khác
  const scoped = scopedBranchId(user!);

  const job = await prisma.jobPosting.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(title !== undefined && { title }),
      ...(department !== undefined && { department: department || null }),
      ...(location !== undefined && { location: location || null }),
      ...(description !== undefined && { description: description || null }),
      ...(requirements !== undefined && { requirements: requirements || null }),
      ...(salaryMin !== undefined && { salaryMin: salaryMin ? Number(salaryMin) : null }),
      ...(salaryMax !== undefined && { salaryMax: salaryMax ? Number(salaryMax) : null }),
      ...(status !== undefined && { status }),
      ...(!scoped && branchId !== undefined && { branchId: branchId || null }),
      ...(quantity !== undefined && { quantity: quantity ? Number(quantity) : null }),
      ...(workTime !== undefined && { workTime: workTime || null }),
      ...(benefits !== undefined && { benefits: benefits || null }),
      ...(criteriaJson !== undefined && { criteria: criteriaJson }),
      ...(tagsStr !== undefined && { tags: tagsStr }),
      ...(isPublic !== undefined && { isPublic: !!isPublic }),
    },
  });

  return NextResponse.json(job);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  if (!(await jobInScope(user!, params.id))) return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền" }, { status: 404 });

  await prisma.jobPosting.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
