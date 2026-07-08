import { NextResponse } from "next/server";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { computeWorkerProfile } from "@/lib/workerProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const profile = await computeWorkerProfile(id);
  if (!profile) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  return NextResponse.json(profile);
}
