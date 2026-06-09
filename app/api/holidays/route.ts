import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllVNHolidays } from "@/lib/holidays";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const holidays = await prisma.holiday.findMany({
    where: { companyId, date: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk import preset
  if (body.preset === true) {
    const year = Number(body.year ?? new Date().getFullYear());
    const presets = getAllVNHolidays(year);
    let imported = 0;
    for (const h of presets) {
      try {
        await prisma.holiday.upsert({
          where: { companyId_date: { companyId, date: h.date } },
          create: { companyId, date: h.date, name: h.name, isNational: true },
          update: { name: h.name },
        });
        imported++;
      } catch {
        // skip duplicates
      }
    }
    return NextResponse.json({ ok: true, imported });
  }

  // Single holiday
  const { date, name, isNational = false } = body;
  if (!date || !name) return NextResponse.json({ error: "Thiếu ngày hoặc tên" }, { status: 400 });

  const holiday = await prisma.holiday.upsert({
    where: { companyId_date: { companyId, date } },
    create: { companyId, date, name, isNational },
    update: { name, isNational },
  });

  return NextResponse.json(holiday);
}
