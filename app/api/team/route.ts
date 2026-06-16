import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_SUBUSER_LIMITS } from "@/lib/permissions";
import bcrypt from "bcryptjs";

function getSessionUser(session: unknown) {
  return (session as { user?: { companyId?: string; role?: string } } | null)?.user;
}

// GET /api/team — list all admins for this company
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = getSessionUser(session);
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admins = await prisma.admin.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true, email: true, role: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(admins);
}

// POST /api/team — create sub-user (owner only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = getSessionUser(session);
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Chỉ chủ tài khoản mới có thể thêm thành viên" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }
  if (!["manager", "accountant"].includes(role)) {
    return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 });
  }

  // Check plan limit
  const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { plan: true } });
  const limit = PLAN_SUBUSER_LIMITS[company?.plan ?? "starter"] ?? 0;
  const currentCount = await prisma.admin.count({ where: { companyId: user.companyId, role: { not: "owner" } } });
  if (currentCount >= limit) {
    return NextResponse.json({
      error: limit === 0
        ? "Gói Starter chỉ có 1 người dùng. Nâng cấp lên Pro để thêm thành viên."
        : `Gói ${company?.plan} tối đa ${limit} thành viên phụ. Nâng cấp để thêm.`,
    }, { status: 403 });
  }

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: { companyId: user.companyId, name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, receiveLeaveEmail: true, receiveTelegram: true, telegramChatId: true, receiveZalo: true, zaloUserId: true, createdAt: true },
  });

  return NextResponse.json(admin);
}
