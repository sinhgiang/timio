import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH — NV đồng ý / từ chối cho công ty liên hệ (double opt-in, Luật 91/2025). body: { action: "accept"|"decline" }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { action } = await req.json().catch(() => ({}));
  if (action !== "accept" && action !== "decline") return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });

  const conn = await prisma.workerConnection.findFirst({ where: { id: params.id, workerAccountId: id } });
  if (!conn) return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });

  const updated = await prisma.workerConnection.update({
    where: { id: params.id },
    data: { status: action === "accept" ? "accepted" : "declined", respondedAt: new Date() },
    select: { id: true, status: true, companyName: true },
  });
  return NextResponse.json({ ok: true, ...updated });
}
