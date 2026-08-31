import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addComment } from "@/lib/announcementSocial";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string; name?: string } | undefined;
  if (!user?.companyId || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ann = await prisma.announcement.findFirst({ where: { id: params.id, companyId: user.companyId }, select: { id: true } });
  if (!ann) return NextResponse.json({ error: "Không tìm thấy bài đăng" }, { status: 404 });

  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Nội dung bình luận trống" }, { status: 400 });

  const comment = await addComment(ann.id, { type: "admin", email: user.email, name: user.name || user.email }, content);
  return NextResponse.json(comment, { status: 201 });
}
