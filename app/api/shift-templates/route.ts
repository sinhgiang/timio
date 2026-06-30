import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.shiftTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, pattern } = await req.json();
  if (!name || !pattern) return NextResponse.json({ error: "Thiếu tên hoặc pattern" }, { status: 400 });

  const tpl = await prisma.shiftTemplate.create({
    data: { companyId, name, pattern: JSON.stringify(pattern) },
  });

  return NextResponse.json(tpl, { status: 201 });
}
