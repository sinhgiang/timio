import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface CustomOptions {
  departments: string[];
  positions: string[];
  shifts: string[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, name } = (await req.json()) as { type: "department" | "position" | "shift"; name: string };
  if (!type || !name?.trim()) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const opts: CustomOptions = company.customOptions
    ? (JSON.parse(company.customOptions) as CustomOptions)
    : { departments: [], positions: [], shifts: [] };

  if (!opts.shifts) opts.shifts = [];

  const trimmed = name.trim();
  if (type === "department") {
    if (!opts.departments.includes(trimmed)) opts.departments.unshift(trimmed);
  } else if (type === "position") {
    if (!opts.positions.includes(trimmed)) opts.positions.unshift(trimmed);
  } else {
    if (!opts.shifts.includes(trimmed)) opts.shifts.push(trimmed);
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { customOptions: JSON.stringify(opts) },
  });

  return NextResponse.json({ ok: true });
}
