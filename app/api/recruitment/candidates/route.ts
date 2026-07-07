import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

// Manager chi nhánh chỉ thấy ứng viên của job thuộc chi nhánh mình (hoặc job toàn công ty)
function candidateBranchFilter(user: ScopeUser) {
  const b = scopedBranchId(user);
  return b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {};
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền truy cập tuyển dụng" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const status = searchParams.get("status");

  const candidates = await prisma.candidate.findMany({
    where: {
      companyId,
      ...(jobId ? { jobId } : {}),
      ...(status ? { status } : {}),
      ...candidateBranchFilter(user!),
    },
    // KHÔNG lấy cvFile (base64 nặng) trong danh sách — chỉ báo có file qua cvFileName
    select: {
      id: true, jobId: true, name: true, email: true, phone: true, status: true, notes: true,
      source: true, experience: true, cvUrl: true, cvFileName: true, aiScore: true, aiSummary: true,
      hiredEmpId: true, appliedAt: true,
      job: { select: { id: true, title: true, department: true, branchId: true } },
    },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền truy cập tuyển dụng" }, { status: 403 });

  const { jobId, name, email, phone, source, notes, experience, cvUrl } = await req.json();
  if (!jobId || !name) return NextResponse.json({ error: "Thiếu jobId hoặc tên ứng viên" }, { status: 400 });

  // Đảm bảo job thuộc phạm vi của người tạo
  const b = scopedBranchId(user!);
  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    select: { id: true },
  });
  if (!job) return NextResponse.json({ error: "Không tìm thấy vị trí hoặc không có quyền" }, { status: 404 });

  const candidate = await prisma.candidate.create({
    data: {
      companyId,
      jobId,
      name,
      email: email || null,
      phone: phone || null,
      source: source || null,
      notes: notes || null,
      experience: experience || null,
      cvUrl: cvUrl || null,
    },
    include: { job: { select: { id: true, title: true, department: true, branchId: true } } },
  });

  return NextResponse.json(candidate, { status: 201 });
}
