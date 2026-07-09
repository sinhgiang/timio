import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — danh sách nhà tuyển dụng đang quan tâm tới mình
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const conns = await prisma.workerConnection.findMany({
    where: { workerAccountId: id },
    select: { id: true, companyName: true, note: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const pending = conns.filter((c) => c.status === "pending").length;
  return NextResponse.json({ pending, connections: conns });
}
