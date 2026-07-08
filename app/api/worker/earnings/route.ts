import { NextResponse } from "next/server";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { computeWorkerEarnings } from "@/lib/workerEarnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — "thu nhập đã kiếm" tạm tính của kỳ hiện tại (tự động từ chấm công)
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const earnings = await computeWorkerEarnings(id);
  return NextResponse.json(earnings);
}
