import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { actorKeyOf, summarizeSocial } from "@/lib/announcementSocial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bảng tin công ty — tin của (các) công ty tôi đang/đã làm, còn hiệu lực, kèm cảm xúc + bình luận
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id }, select: { companyId: true } });
  const companyIds = Array.from(new Set(emps.map((e) => e.companyId)));
  if (companyIds.length === 0) return NextResponse.json({ items: [] });
  const now = new Date();
  const items = await prisma.announcement.findMany({
    where: { companyId: { in: companyIds }, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
    select: {
      id: true, title: true, content: true, type: true, pinned: true, publishedAt: true,
      images: true, videoUrl: true, linkUrl: true, linkPreview: true, hashtags: true,
      company: { select: { name: true } },
      reactions: { select: { emoji: true, actorKey: true, authorName: true } },
      comments: {
        select: { id: true, content: true, authorName: true, authorAvatarUrl: true, createdAt: true, actorType: true, actorKey: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: 30,
  });
  const viewerKey = actorKeyOf({ type: "worker", workerAccountId: id, name: "" });
  const social = summarizeSocial(items, viewerKey);
  return NextResponse.json({
    items: social.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      pinned: a.pinned,
      publishedAt: a.publishedAt.toISOString(),
      companyName: a.company?.name ?? "",
      images: a.images ? JSON.parse(a.images) : [],
      videoUrl: a.videoUrl,
      linkUrl: a.linkUrl,
      linkPreview: a.linkPreview ? JSON.parse(a.linkPreview) : null,
      hashtags: a.hashtags ? JSON.parse(a.hashtags) : [],
      reactionCounts: a.reactionCounts,
      myReaction: a.myReaction,
      // Không lộ actorKey ("admin:<email>" / "worker:<id>") ra app nhân viên — chỉ dùng nội bộ
      // để resolve employeeId bên dashboard admin (xem app/api/announcements/route.ts).
      comments: a.comments.map(({ actorKey: _actorKey, ...c }) => c),
    })),
  });
}
