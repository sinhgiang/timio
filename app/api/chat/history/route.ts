import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateChatUser } from "@/lib/chatAuth";
import { checkChatAccess } from "@/lib/chatLimits";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/history
 * Lấy session chat gần nhất của user hiện tại + messages.
 * ?sessionId=... để lấy session cụ thể (phải thuộc về user).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateChatUser(req);
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    const session = sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: sessionId, userId: user.adminId, companyId: user.companyId },
        })
      : await prisma.chatSession.findFirst({
          where: { userId: user.adminId, companyId: user.companyId },
          orderBy: { updatedAt: "desc" },
        });

    // Kiểm tra quota để UI hiện đúng trạng thái
    const access = await checkChatAccess(user.companyId, user.adminId);

    if (!session) {
      return NextResponse.json({
        sessionId: null,
        messages: [],
        access: { allowed: access.allowed, reason: access.reason, message: access.message, remaining: access.remaining },
        role: user.role,
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return NextResponse.json({
      sessionId: session.id,
      messages,
      access: { allowed: access.allowed, reason: access.reason, message: access.message, remaining: access.remaining },
      role: user.role,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/history — bắt đầu cuộc trò chuyện mới
 * (không xoá dữ liệu, chỉ để client tạo session mới ở tin nhắn tiếp theo)
 */
export async function DELETE(req: NextRequest) {
  const user = await authenticateChatUser(req);
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
