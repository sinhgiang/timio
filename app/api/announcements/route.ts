import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actorKeyOf, extractHashtags, summarizeSocial } from "@/lib/announcementSocial";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      companyId,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    include: {
      reactions: { select: { emoji: true, actorKey: true } },
      comments: {
        select: { id: true, content: true, authorName: true, authorAvatarUrl: true, createdAt: true, actorType: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  });

  const viewerKey = user?.email ? actorKeyOf({ type: "admin", email: user.email, name: user.email }) : null;
  const items = summarizeSocial(announcements, viewerKey).map((a) => ({
    ...a,
    images: a.images ? JSON.parse(a.images) : [],
    linkPreview: a.linkPreview ? JSON.parse(a.linkPreview) : null,
    hashtags: a.hashtags ? JSON.parse(a.hashtags) : [],
  }));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; email?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content, type, pinned, expiresAt, images, videoUrl, linkUrl, linkPreview } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Thiếu tiêu đề hoặc nội dung" }, { status: 400 });

  const hashtags = extractHashtags(`${title} ${content}`);

  const ann = await prisma.announcement.create({
    data: {
      companyId,
      title,
      content,
      type: type || "info",
      pinned: Boolean(pinned),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: user?.email || null,
      images: Array.isArray(images) && images.length ? JSON.stringify(images.slice(0, 10)) : null,
      videoUrl: typeof videoUrl === "string" && videoUrl ? videoUrl : null,
      linkUrl: typeof linkUrl === "string" && linkUrl ? linkUrl : null,
      linkPreview: linkPreview ? JSON.stringify(linkPreview) : null,
      hashtags: hashtags.length ? JSON.stringify(hashtags) : null,
    },
  });

  return NextResponse.json(ann, { status: 201 });
}
