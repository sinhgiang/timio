import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Danh sách "quan tâm" công ty đã gửi — lộ liên hệ khi ứng viên đã ĐỒNG Ý
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const interests = await prisma.talentInterest.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Với interest đã accepted → lấy liên hệ thật của ứng viên
  const acceptedProfileIds = interests.filter((i) => i.status === "accepted").map((i) => i.profileId);
  const profiles = acceptedProfileIds.length
    ? await prisma.talentProfile.findMany({ where: { id: { in: acceptedProfileIds } }, select: { id: true, employeeId: true, desiredTitle: true } })
    : [];
  const empByProfile = new Map<string, { name: string; phone: string | null; email: string | null }>();
  if (profiles.length) {
    const emps = await prisma.employee.findMany({ where: { id: { in: profiles.map((p) => p.employeeId) } }, select: { id: true, name: true, phone: true, email: true } });
    const empMap = new Map(emps.map((e) => [e.id, e]));
    for (const p of profiles) {
      const e = empMap.get(p.employeeId);
      if (e) empByProfile.set(p.id, { name: e.name, phone: e.phone, email: e.email });
    }
  }

  return NextResponse.json({
    items: interests.map((i) => ({
      id: i.id,
      profileId: i.profileId,
      maskedName: `Ứng viên #${i.profileId.slice(-4).toUpperCase()}`,
      status: i.status,
      message: i.message,
      createdAt: i.createdAt.toISOString(),
      contact: i.status === "accepted" ? (empByProfile.get(i.profileId) ?? null) : null,
    })),
  });
}
