import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractHashtags } from "@/lib/announcementSocial";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content, type, pinned, expiresAt, images, videoUrl, linkUrl, linkPreview } = await req.json();

  let hashtags: string[] | undefined;
  if (title !== undefined || content !== undefined) {
    const current = await prisma.announcement.findUnique({ where: { id: params.id }, select: { title: true, content: true } });
    hashtags = extractHashtags(`${title ?? current?.title ?? ""} ${content ?? current?.content ?? ""}`);
  }

  await prisma.announcement.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(type !== undefined && { type }),
      ...(pinned !== undefined && { pinned: Boolean(pinned) }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(images !== undefined && { images: Array.isArray(images) && images.length ? JSON.stringify(images.slice(0, 10)) : null }),
      ...(videoUrl !== undefined && { videoUrl: videoUrl || null }),
      ...(linkUrl !== undefined && { linkUrl: linkUrl || null }),
      ...(linkPreview !== undefined && { linkPreview: linkPreview ? JSON.stringify(linkPreview) : null }),
      ...(hashtags !== undefined && { hashtags: hashtags.length ? JSON.stringify(hashtags) : null }),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.announcement.deleteMany({ where: { id: params.id, companyId } });
  return NextResponse.json({ ok: true });
}
