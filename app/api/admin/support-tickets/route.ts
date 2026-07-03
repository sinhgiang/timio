import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session || role !== "super_admin") return null;
  return session;
}

/** GET — super admin xem tất cả tickets từ mọi công ty */
export async function GET(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tickets = await prisma.supportTicket.findMany({
    where: status && status !== "all" ? { status } : {},
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const counts = await prisma.supportTicket.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return NextResponse.json({
    tickets,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count.id])),
  });
}

/** PATCH — cập nhật status / reply ticket, gửi email cho user */
export async function PATCH(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await req.json()) as { id?: string; status?: string; adminReply?: string };
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const ticket = await prisma.supportTicket.findUnique({ where: { id: body.id } });
  if (!ticket) return NextResponse.json({ error: "Không tìm thấy ticket" }, { status: 404 });

  const updated = await prisma.supportTicket.update({
    where: { id: body.id },
    data: {
      ...(body.status && ["new", "in_progress", "resolved"].includes(body.status) ? { status: body.status } : {}),
      ...(typeof body.adminReply === "string" ? { adminReply: body.adminReply } : {}),
    },
  });

  // Gửi email phản hồi cho user nếu có reply mới
  if (body.adminReply && body.adminReply.trim() && body.adminReply !== ticket.adminReply) {
    sendEmail({
      to: ticket.userEmail,
      subject: `[Timio] Phản hồi ticket: ${ticket.title.slice(0, 80)}`,
      html: `
        <h2>Timio đã phản hồi ticket của bạn</h2>
        <p><b>Ticket:</b> ${ticket.title}</p>
        <p><b>Phản hồi từ team Timio:</b></p>
        <div style="background:#eff6ff;padding:12px;border-radius:8px;white-space:pre-wrap">${body.adminReply}</div>
        <p style="color:#6b7280;font-size:13px">Nếu cần hỗ trợ thêm, bạn có thể trả lời email này hoặc tạo ticket mới trong app.</p>
      `,
    }).catch(() => { /* ignore */ });
  }

  return NextResponse.json({ ok: true, ticket: updated });
}
