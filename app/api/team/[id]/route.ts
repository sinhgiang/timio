import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getSessionUser(session: unknown) {
  return (session as { user?: { companyId?: string; role?: string; email?: string } } | null)?.user;
}

// PATCH /api/team/[id] — update role or notification prefs
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = getSessionUser(session);
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Owner can update others; any admin can update their own notification prefs
  const target = await prisma.admin.findFirst({ where: { id: params.id, companyId: user.companyId } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const body = await req.json();
  const isSelf = target.email === user.email;
  const isOwner = user.role === "owner";

  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  // Only owner can change role; anyone can toggle their own notification prefs
  const data: Record<string, unknown> = {};
  if (isOwner && body.role && !["manager", "accountant"].includes(body.role)) {
    return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 });
  }
  if (isOwner && body.role !== undefined) data.role = body.role;
  if (isOwner && body.branchId !== undefined) data.branchId = body.branchId || null;
  if ((isOwner || isSelf) && body.gender !== undefined) data.gender = (body.gender === "male" || body.gender === "female") ? body.gender : null;
  if (body.receiveLeaveEmail !== undefined) data.receiveLeaveEmail = Boolean(body.receiveLeaveEmail);
  if (body.receiveTelegram !== undefined) data.receiveTelegram = Boolean(body.receiveTelegram);
  if (body.telegramChatId !== undefined) data.telegramChatId = body.telegramChatId || null;
  if (body.receiveZalo !== undefined) data.receiveZalo = Boolean(body.receiveZalo);
  if (body.zaloUserId !== undefined) data.zaloUserId = body.zaloUserId || null;
  if (body.receiveDailyReport !== undefined) data.receiveDailyReport = Boolean(body.receiveDailyReport);

  const updated = await prisma.admin.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, gender: true, branchId: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true, receiveDailyReport: true, createdAt: true,
      branch: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/team/[id] — remove sub-user (owner only, cannot delete owner)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = getSessionUser(session);
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Chỉ chủ tài khoản mới có thể xóa thành viên" }, { status: 403 });
  }

  const target = await prisma.admin.findFirst({ where: { id: params.id, companyId: user.companyId } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (target.role === "owner") return NextResponse.json({ error: "Không thể xóa chủ tài khoản" }, { status: 400 });

  await prisma.admin.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
