import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — danh sách thông báo + số chưa đọc
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const [items, unread] = await Promise.all([
    prisma.workerNotification.findMany({ where: { workerAccountId: id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.workerNotification.count({ where: { workerAccountId: id, read: false } }),
  ]);
  return NextResponse.json({ unread, items });
}

// PATCH — đánh dấu đã đọc. body: { id } hoặc { all: true }
export async function PATCH(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { id: notifId, all } = await req.json().catch(() => ({}));
  if (all) await prisma.workerNotification.updateMany({ where: { workerAccountId: id, read: false }, data: { read: true } });
  else if (notifId) await prisma.workerNotification.updateMany({ where: { id: notifId, workerAccountId: id }, data: { read: true } });
  else return NextResponse.json({ error: "Thiếu tham số." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
