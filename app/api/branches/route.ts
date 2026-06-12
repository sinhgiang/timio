import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = (session?.user as { companyId?: string })?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, checkInTime, checkOutTime, gracePeriod, workDays, lat, lng, gpsRadius } = await req.json();
    if (!name) return NextResponse.json({ error: "Thiếu tên chi nhánh" }, { status: 400 });

    const branch = await prisma.branch.create({
      data: {
        name, checkInTime, checkOutTime, gracePeriod, workDays, companyId,
        lat: lat !== null && lat !== undefined ? Number(lat) : null,
        lng: lng !== null && lng !== undefined ? Number(lng) : null,
        gpsRadius: gpsRadius ? Number(gpsRadius) : 200,
      },
    });

    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
