import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      companyId,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  });

  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content, type, pinned, expiresAt } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung" }, { status: 400 });

  const ann = await prisma.announcement.create({
    data: {
      companyId,
      title,
      content,
      type: type || "info",
      pinned: Boolean(pinned),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: user?.email || null,
    },
  });

  return NextResponse.json(ann, { status: 201 });
}
