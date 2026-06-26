import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, checkInTime, checkOutTime, gracePeriod, workDays, lat, lng, gpsRadius, standardWorkDays } = await req.json();

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
    const isPro = company?.plan === "pro" || company?.plan === "business";

    const branch = await prisma.branch.update({
      where: { id: params.id, companyId },
      data: {
        name, checkInTime, checkOutTime,
        gracePeriod: Number(gracePeriod),
        workDays,
        ...(isPro && {
          lat: lat !== undefined ? (lat !== null ? Number(lat) : null) : undefined,
          lng: lng !== undefined ? (lng !== null ? Number(lng) : null) : undefined,
          gpsRadius: gpsRadius !== undefined ? Number(gpsRadius) : undefined,
        }),
        standardWorkDays: standardWorkDays !== undefined ? Number(standardWorkDays) : undefined,
      },
    });
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.branch.delete({ where: { id: params.id, companyId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
