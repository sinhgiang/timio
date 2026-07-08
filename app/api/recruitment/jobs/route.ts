import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

// Tuyển dụng: owner + manager dùng được; accountant KHÔNG truy cập.
// Manager chi nhánh chỉ thấy job branchId của mình (hoặc job toàn công ty branchId=null).
function jobBranchFilter(user: ScopeUser) {
  const b = scopedBranchId(user);
  return b ? { OR: [{ branchId: b }, { branchId: null }] } : {};
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền truy cập tuyển dụng" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const jobs = await prisma.jobPosting.findMany({
    where: { companyId, ...(status ? { status } : {}), ...jobBranchFilter(user!) },
    include: { _count: { select: { candidates: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền truy cập tuyển dụng" }, { status: 403 });

  const { title, department, location, description, requirements, salaryMin, salaryMax,
    branchId, quantity, workTime, benefits, isPublic, criteria } = await req.json();
  if (!title) return NextResponse.json({ error: "Thiếu tiêu đề vị trí" }, { status: 400 });

  const criteriaJson = Array.isArray(criteria)
    ? JSON.stringify(criteria.map((c: unknown) => String(c).trim()).filter(Boolean).slice(0, 8))
    : null;

  // Manager chi nhánh: job luôn gắn vào chi nhánh của họ (không cho tạo cho chi nhánh khác)
  const scoped = scopedBranchId(user!);
  const finalBranchId = scoped ?? (branchId || null);

  const job = await prisma.jobPosting.create({
    data: {
      companyId,
      title,
      department: department || null,
      location: location || null,
      description: description || null,
      requirements: requirements || null,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      branchId: finalBranchId,
      quantity: quantity ? Number(quantity) : null,
      workTime: workTime || null,
      benefits: benefits || null,
      criteria: criteriaJson,
      isPublic: isPublic === undefined ? true : !!isPublic,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
