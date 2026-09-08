import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { actorKeyOf, editComment, deleteComment } from "@/lib/announcementSocial";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  if (!user?.companyId || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Nội dung bình luận trống" }, { status: 400 });

  const actorKey = actorKeyOf({ type: "admin", email: user.email, name: user.email });
  try {
    const comment = await editComment(params.commentId, actorKey, content);
    return NextResponse.json({ ok: true, id: comment.id, content: comment.content, updatedAt: comment.updatedAt?.toISOString() ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không sửa được bình luận" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  if (!user?.companyId || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actorKey = actorKeyOf({ type: "admin", email: user.email, name: user.email });
  try {
    await deleteComment(params.commentId, actorKey);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không xoá được bình luận" }, { status: 400 });
  }
}
