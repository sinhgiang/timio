import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getValidOaToken, getOaFollowers } from "@/lib/zalo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET: danh sách người đã follow OA + trạng thái đã gán nhân viên nào chưa
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: {
      id: true, zaloOaToken: true, zaloAppId: true, zaloSecretKey: true,
      zaloRefreshToken: true, zaloTokenExpiresAt: true,
    },
  });
  if (!company?.zaloOaToken && !company?.zaloRefreshToken) {
    return NextResponse.json({ error: "Chưa kết nối Zalo OA. Vào Cài đặt để nhập token." }, { status: 400 });
  }

  const token = await getValidOaToken(company!);
  if (!token) {
    return NextResponse.json({ error: "Token Zalo không hợp lệ hoặc đã hết hạn. Vào Cài đặt để cập nhật." }, { status: 400 });
  }

  const followers = await getOaFollowers(token);

  // Map userId → employee đã gán
  const mapped = await prisma.employee.findMany({
    where: { companyId: user.companyId, zaloUserId: { not: null } },
    select: { id: true, name: true, code: true, zaloUserId: true },
  });
  const byUserId = new Map(mapped.map((e) => [e.zaloUserId as string, e]));

  return NextResponse.json({
    followers: followers.map((f) => ({
      userId: f.userId,
      displayName: f.displayName,
      avatar: f.avatar,
      mappedEmployee: byUserId.get(f.userId)
        ? { id: byUserId.get(f.userId)!.id, name: byUserId.get(f.userId)!.name }
        : null,
    })),
  });
}

// POST: gán 1 zaloUserId cho 1 nhân viên (employeeId=null để bỏ gán)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId || user.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, employeeId } = await req.json();
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
  }

  // Bỏ zaloUserId này khỏi mọi nhân viên khác (1 Zalo chỉ gán 1 người)
  await prisma.employee.updateMany({
    where: { companyId: user.companyId, zaloUserId: userId },
    data: { zaloUserId: null },
  });

  if (employeeId) {
    await prisma.employee.updateMany({
      where: { id: employeeId, companyId: user.companyId },
      data: { zaloUserId: userId },
    });
  }

  return NextResponse.json({ ok: true });
}
