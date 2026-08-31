import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isReactionKey, toggleReaction } from "@/lib/announcementSocial";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string; name?: string } | undefined;
  if (!user?.companyId || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ann = await prisma.announcement.findFirst({ where: { id: params.id, companyId: user.companyId }, select: { id: true } });
  if (!ann) return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });

  const { emoji } = await req.json();
  if (!isReactionKey(emoji)) return NextResponse.json({ error: "Cảm xúc không hợp lệ" }, { status: 400 });

  const result = await toggleReaction(ann.id, { type: "admin", email: user.email, name: user.name || user.email }, emoji);
  return NextResponse.json({ myReaction: result ? emoji : null });
}
