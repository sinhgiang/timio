import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApplicationToken } from "@/lib/applicationToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — trạng thái hồ sơ ứng tuyển (ứng viên tự xem qua link).
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const candidateId = verifyApplicationToken(params.token);
  if (!candidateId) return NextResponse.json({ error: "Liên kết không hợp lệ." }, { status: 400 });

  const cand = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true, name: true, status: true, interviewAt: true, appliedAt: true,
      job: { select: { title: true } },
      company: { select: { name: true, logoUrl: true } },
    },
  });
  if (!cand) return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  return NextResponse.json({
    name: cand.name,
    jobTitle: cand.job?.title ?? "",
    companyName: cand.company?.name ?? "",
    logoUrl: cand.company?.logoUrl ?? null,
    status: cand.status,
    interviewAt: cand.interviewAt?.toISOString() ?? null,
    appliedAt: cand.appliedAt.toISOString(),
  });
}

// POST — ứng viên rút hồ sơ (quyền của họ).
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const candidateId = verifyApplicationToken(params.token);
  if (!candidateId) return NextResponse.json({ error: "Liên kết không hợp lệ." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "withdraw") return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });

  const cand = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true, status: true } });
  if (!cand) return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });
  if (cand.status === "hired") return NextResponse.json({ error: "Hồ sơ đã được tuyển, không thể rút." }, { status: 400 });

  await prisma.candidate.update({ where: { id: candidateId }, data: { status: "rejected", notes: undefined } });
  return NextResponse.json({ ok: true });
}
