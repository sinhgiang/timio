import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { addComment } from "@/lib/announcementSocial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workerId = getWorkerAccountId();
  if (!workerId) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const ann = await prisma.announcement.findUnique({ where: { id: params.id }, select: { id: true, companyId: true } });
  if (!ann) return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });

  // Chỉ nhân viên đang/đã thuộc công ty đăng bài mới được bình luận
  const belongs = await prisma.employee.findFirst({ where: { workerAccountId: workerId, companyId: ann.companyId }, select: { id: true } });
  if (!belongs) return NextResponse.json({ error: "Bạn không thuộc công ty này" }, { status: 403 });

  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Nội dung bình luận trống" }, { status: 400 });

  const worker = await prisma.workerAccount.findUnique({ where: { id: workerId }, select: { name: true, avatarUrl: true } });
  const comment = await addComment(
    ann.id,
    { type: "worker", workerAccountId: workerId, name: worker?.name || "Nhân viên", avatarUrl: worker?.avatarUrl },
    content
  );
  return NextResponse.json(comment, { status: 201 });
}
