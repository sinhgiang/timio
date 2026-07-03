import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateChatUser } from "@/lib/chatAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/sessions — CHỈ admin (owner)
 * Xem lịch sử chat của toàn bộ staff trong công ty (audit trail).
 * - Không tham số: danh sách sessions (kèm preview)
 * - ?sessionId=...: toàn bộ messages của 1 session
 */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateChatUser(req);
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    if (user.role !== "owner") {
      return NextResponse.json({ error: "Chỉ admin mới xem được lịch sử chat của nhân viên" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, companyId: user.companyId },
      });
      if (!session) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, toolsUsed: true, createdAt: true },
      });
      return NextResponse.json({
        session: {
          id: session.id,
          userName: session.userName,
          userRole: session.userRole,
          userEmail: session.userEmail,
          createdAt: session.createdAt,
        },
        messages,
      });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: { role: true, content: true, createdAt: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        userName: s.userName,
        userRole: s.userRole,
        userEmail: s.userEmail,
        messageCount: s._count.messages,
        lastMessages: s.messages.reverse().map((m) => ({
          role: m.role,
          preview: m.content.slice(0, 150),
          createdAt: m.createdAt,
        })),
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
