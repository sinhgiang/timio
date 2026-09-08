import { NextRequest, NextResponse } from "next/server";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { actorKeyOf, editComment, deleteComment } from "@/lib/announcementSocial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sửa bình luận của chính mình (kiểu Facebook — không cần vào lại thuộc công ty, chỉ cần
// đúng chủ bình luận, giống logic addComment không đổi được sau khi rời công ty).
export async function PATCH(req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const workerId = getWorkerAccountId();
  if (!workerId) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Nội dung bình luận trống" }, { status: 400 });

  const actorKey = actorKeyOf({ type: "worker", workerAccountId: workerId, name: "" });
  try {
    const comment = await editComment(params.commentId, actorKey, content);
    return NextResponse.json({ ok: true, id: comment.id, content: comment.content, updatedAt: comment.updatedAt?.toISOString() ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không sửa được bình luận" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; commentId: string } }) {
  const workerId = getWorkerAccountId();
  if (!workerId) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const actorKey = actorKeyOf({ type: "worker", workerAccountId: workerId, name: "" });
  try {
    await deleteComment(params.commentId, actorKey);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không xoá được bình luận" }, { status: 400 });
  }
}
