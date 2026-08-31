import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { isReactionKey, toggleReaction } from "@/lib/announcementSocial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workerId = getWorkerAccountId();
  if (!workerId) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const ann = await prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true, companyId: true } });
  if (!ann) return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });

  const belongs = await prisma.employee.findFirst({ where: { workerAccountId: workerId, companyId: ann.companyId }, select: { id: true } });
  if (!belongs) return NextResponse.json({ error: "Bạn không thuộc công ty này" }, { status: 403 });

  const { emoji } = await req.json();
  if (!isReactionKey(emoji)) return NextResponse.json({ error: "Cảm xúc không hợp lệ" }, { status: 400 });

  const worker = await prisma.workerAccount.findUnique({ where: { id: workerId }, select: { name: true } });
  const result = await toggleReaction(ann.id, { type: "worker", workerAccountId: workerId, name: worker?.name || "Nhân viên" }, emoji);
  return NextResponse.json({ myReaction: result ? emoji : null });
}
