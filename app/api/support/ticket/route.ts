import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateChatUser } from "@/lib/chatAuth";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "admin@sinhgiang.com";

/** POST /api/support/ticket — user tạo ticket hỗ trợ gửi team Timio */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateChatUser(req);
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = (await req.json()) as { title?: string; description?: string; priority?: string };
    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    const priority = ["urgent", "normal", "low"].includes(body.priority ?? "") ? body.priority! : "normal";

    if (!title || title.length < 5) {
      return NextResponse.json({ error: "Tiêu đề tối thiểu 5 ký tự" }, { status: 400 });
    }
    if (!description || description.length < 10) {
      return NextResponse.json({ error: "Mô tả tối thiểu 10 ký tự" }, { status: 400 });
    }

    // Chống spam: tối đa 5 ticket/ngày/user
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const recentCount = await prisma.supportTicket.count({
      where: { userEmail: user.email, createdAt: { gte: since } },
    });
    if (recentCount >= 5) {
      return NextResponse.json(
        { error: "Bạn đã gửi quá nhiều ticket hôm nay. Vui lòng chờ phản hồi hoặc liên hệ Zalo." },
        { status: 429 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        companyId: user.companyId,
        companyName: user.companyName,
        userEmail: user.email,
        userName: user.name,
        title: title.slice(0, 200),
        description: description.slice(0, 3000),
        priority,
      },
    });

    // Báo cho team Timio qua email (không chặn response nếu lỗi)
    const priorityLabel = priority === "urgent" ? "🔴 KHẨN" : priority === "low" ? "🟢 Thấp" : "🟡 Bình thường";
    sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Timio Ticket] ${priorityLabel} — ${title.slice(0, 80)} (${user.companyName})`,
      html: `
        <h2>Ticket hỗ trợ mới #${ticket.id.slice(-6)}</h2>
        <p><b>Công ty:</b> ${user.companyName}</p>
        <p><b>Người gửi:</b> ${user.name} (${user.email}) — vai trò: ${user.role}</p>
        <p><b>Mức độ:</b> ${priorityLabel}</p>
        <p><b>Tiêu đề:</b> ${title}</p>
        <p><b>Nội dung:</b></p>
        <div style="background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap">${description}</div>
        <p><a href="https://timio.vn/admin/support-tickets">Xem tất cả tickets →</a></p>
      `,
    }).catch(() => { /* email lỗi không chặn ticket */ });

    return NextResponse.json({
      ok: true,
      ticketId: ticket.id,
      message: "Đã gửi ticket! Team Timio sẽ phản hồi qua email trong giờ làm việc (8h–18h T2–T7).",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** GET /api/support/ticket — user xem các ticket của mình */
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateChatUser(req);
    if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
      where: { userEmail: user.email, companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, priority: true, status: true, adminReply: true, createdAt: true, updatedAt: true,
      },
    });
    return NextResponse.json({ tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
