import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashWorkerPassword, makeWorkerToken, WORKER_COOKIE } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — kích hoạt tài khoản: đặt mật khẩu + đồng ý. body: { token, password, consentApp, consentFinance? }
export async function POST(req: NextRequest) {
  const { token, password, consentApp, consentFinance } = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: "Thiếu mã kích hoạt." }, { status: 400 });
  if (!consentApp) return NextResponse.json({ error: "Vui lòng đồng ý điều khoản để tiếp tục." }, { status: 400 });
  if (!password || String(password).length < 4) return NextResponse.json({ error: "Mật khẩu tối thiểu 4 ký tự." }, { status: 400 });

  const wa = await prisma.workerAccount.findUnique({ where: { activationToken: String(token) }, select: { id: true } });
  if (!wa) return NextResponse.json({ error: "Liên kết kích hoạt không hợp lệ hoặc đã dùng." }, { status: 404 });

  const now = new Date();
  await prisma.workerAccount.update({
    where: { id: wa.id },
    data: {
      passwordHash: await hashWorkerPassword(String(password)),
      activatedAt: now,
      consentAppAt: now,
      consentFinanceAt: consentFinance ? now : null,
      activationToken: null, // dùng 1 lần
    },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(WORKER_COOKIE, makeWorkerToken(wa.id), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
