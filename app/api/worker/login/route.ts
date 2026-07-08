import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compareWorkerPassword, makeWorkerToken, normPhone, WORKER_COOKIE } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — đăng nhập bằng SĐT + mật khẩu. body: { phone, password }
export async function POST(req: NextRequest) {
  const { phone, password } = await req.json().catch(() => ({}));
  const ph = normPhone(phone);
  if (!ph || !password) return NextResponse.json({ error: "Nhập số điện thoại và mật khẩu." }, { status: 400 });

  const wa = await prisma.workerAccount.findUnique({ where: { phone: ph }, select: { id: true, passwordHash: true } });
  if (!wa) return NextResponse.json({ error: "Số điện thoại chưa có tài khoản. Hỏi công ty để nhận link kích hoạt." }, { status: 404 });
  if (!wa.passwordHash) return NextResponse.json({ error: "Tài khoản chưa kích hoạt. Mở link kích hoạt công ty gửi.", needActivate: true }, { status: 403 });

  const ok = await compareWorkerPassword(String(password), wa.passwordHash);
  if (!ok) return NextResponse.json({ error: "Mật khẩu không đúng." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(WORKER_COOKIE, makeWorkerToken(wa.id), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
