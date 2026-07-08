import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { computeWorkerProfile } from "@/lib/workerProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — hồ sơ CÔNG KHAI theo handle (ai có link cũng xem được phần hồ sơ).
// isOwner=true nếu người xem đang đăng nhập chính là chủ hồ sơ (để client hiện tab riêng tư).
export async function GET(_req: NextRequest, { params }: { params: { handle: string } }) {
  const account = await prisma.workerAccount.findUnique({
    where: { handle: params.handle },
    select: { id: true, activatedAt: true },
  });
  if (!account) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

  const profile = await computeWorkerProfile(account.id);
  if (!profile) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

  const viewerId = getWorkerAccountId();
  const isOwner = viewerId === account.id;

  return NextResponse.json({ ...profile, isOwner });
}
