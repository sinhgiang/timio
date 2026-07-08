import { NextResponse } from "next/server";
import { WORKER_COOKIE } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WORKER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
