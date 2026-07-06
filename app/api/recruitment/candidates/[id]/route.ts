import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

// Ứng viên có thuộc phạm vi chi nhánh của manager không (xét qua job)
async function candidateInScope(user: ScopeUser, id: string): Promise<boolean> {
  const b = scopedBranchId(user);
  const cand = await prisma.candidate.findFirst({
    where: {
      id,
      companyId: user.companyId,
      ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}),
    },
    select: { id: true },
  });
  return !!cand;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  if (!(await candidateInScope(user!, params.id))) return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền" }, { status: 404 });

  const { status, notes, hiredEmpId, name, email, phone, source, experience, cvUrl } = await req.json();

  const updated = await prisma.candidate.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(hiredEmpId !== undefined && { hiredEmpId: hiredEmpId || null }),
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(source !== undefined && { source: source || null }),
      ...(experience !== undefined && { experience: experience || null }),
      ...(cvUrl !== undefined && { cvUrl: cvUrl || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  if (!(await candidateInScope(user!, params.id))) return NextResponse.json({ error: "Không tìm thấy hoặc không có quyền" }, { status: 404 });

  await prisma.candidate.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
