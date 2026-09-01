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
      reactions: { select: { emoji: true, actorKey: true, authorName: true } },
      comments: {
        select: { id: true, content: true, authorName: true, authorAvatarUrl: true, createdAt: true, actorType: true, actorKey: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
  });

  const viewerKey = user?.email ? actorKeyOf({ type: "admin", email: user.email, name: user.email }) : null;
  const social = summarizeSocial(announcements, viewerKey);

  // Kích ai đã thích/bình luận → xem hồ sơ nhân viên (kiểu Facebook): resolve actorKey
  // "worker:<workerAccountId>" thành employeeId TRONG CÔNG TY NÀY (1 người có thể là nhân viên
  // nhiều công ty qua nhiều lần đi làm — chỉ link tới bản ghi thuộc công ty đang xem).
  const workerAccountIds = new Set<string>();
  for (const a of social) {
    for (const r of a.reactors) if (r.actorKey.startsWith("worker:")) workerAccountIds.add(r.actorKey.slice(7));
    for (const c of a.comments) if (c.actorKey.startsWith("worker:")) workerAccountIds.add(c.actorKey.slice(7));
  }
  const empByWorkerAccount = new Map<string, string>();
  if (workerAccountIds.size > 0) {
    const emps = await prisma.employee.findMany({
      where: { companyId, workerAccountId: { in: Array.from(workerAccountIds) } },
      select: { id: true, workerAccountId: true },
    });
    for (const e of emps) if (e.workerAccountId) empByWorkerAccount.set(e.workerAccountId, e.id);
  }
  const employeeIdOf = (actorKey: string): string | null =>
    actorKey.startsWith("worker:") ? empByWorkerAccount.get(actorKey.slice(7)) ?? null : null;

  const items = social.map((a) => ({
    ...a,
    images: a.images ? JSON.parse(a.images) : [],
    linkPreview: a.linkPreview ? JSON.parse(a.linkPreview) : null,
    hashtags: a.hashtags ? JSON.parse(a.hashtags) : [],
    reactors: a.reactors.map((r) => ({ emoji: r.emoji, authorName: r.authorName, employeeId: employeeIdOf(r.actorKey) })),
    comments: a.comments.map(({ actorKey, ...c }) => ({ ...c, employeeId: employeeIdOf(actorKey) })),
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
