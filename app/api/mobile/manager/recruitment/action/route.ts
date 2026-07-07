import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

const VALID = ["new", "reviewing", "interview", "offer", "hired", "rejected"];

export async function POST(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (auth.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id, status } = await req.json();
  if (!id || !VALID.includes(status)) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const b = scopedBranchId(auth);
  const cand = await prisma.candidate.findFirst({
    where: { id, companyId: auth.companyId, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
    select: { id: true },
  });
  if (!cand) return NextResponse.json({ error: "Không tìm thấy ứng viên" }, { status: 404 });

  await prisma.candidate.update({
    where: { id: cand.id },
    data: { status, ...(status === "hired" ? { hiredAt: new Date() } : {}) },
  });

  return NextResponse.json({ ok: true, id: cand.id, status });
}
