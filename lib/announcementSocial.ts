// Bảng tin nội bộ kiểu "cộng đồng" (31/8/2026): bình luận + thả cảm xúc trên Announcement.
// Dùng chung cho cả 2 phía — admin/HR (session NextAuth, app/api/announcements/*) và nhân viên
// (cookie worker, app/api/worker/announcements/*) — nên actor được trừu tượng hoá ở đây, không
// import next-auth hay workerAuth trực tiếp (route gọi vào tự lấy actor rồi truyền xuống).
import { prisma } from "@/lib/prisma";

export type Actor =
  | { type: "admin"; email: string; name: string }
  | { type: "worker"; workerAccountId: string; name: string; avatarUrl?: string | null };

export function actorKeyOf(actor: Actor): string {
  return actor.type === "admin" ? `admin:${actor.email}` : `worker:${actor.workerAccountId}`;
}

// Cảm xúc kiểu Facebook — mỗi actor 1 cảm xúc/bài (bấm lại cùng emoji = bỏ, bấm khác = đổi).
export const REACTIONS = [
  { key: "like", emoji: "👍", label: "Thích" },
  { key: "love", emoji: "❤️", label: "Yêu thích" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "sad", emoji: "😢", label: "Buồn" },
  { key: "angry", emoji: "😡", label: "Phẫn nộ" },
] as const;
export type ReactionKey = (typeof REACTIONS)[number]["key"];

export function isReactionKey(v: unknown): v is ReactionKey {
  return typeof v === "string" && REACTIONS.some((r) => r.key === v);
}

// Tách #hashtag từ nội dung bài đăng — hỗ trợ chữ có dấu tiếng Việt (\p{L} = mọi chữ cái Unicode).
// Dùng RegExp(string) thay vì literal /…/u — tsconfig chưa set target ES6+ nên literal có flag "u"
// bị chặn ở bước biên dịch (TS1501); constructor-form không bị kiểm tra này, chạy đúng ở Node.
const HASHTAG_RE = new RegExp("#[\\p{L}\\p{N}_]+", "gu");
export function extractHashtags(content: string): string[] {
  const matches = content.match(HASHTAG_RE) || [];
  return Array.from(new Set(matches.map((h) => h.slice(1).toLowerCase())));
}

export async function addComment(announcementId: string, actor: Actor, content: string) {
  const text = content.trim().slice(0, 2000);
  if (!text) throw new Error("Nội dung bình luận trống");
  return prisma.announcementComment.create({
    data: {
      announcementId,
      content: text,
      actorType: actor.type,
      actorKey: actorKeyOf(actor),
      authorName: actor.name,
      authorAvatarUrl: actor.type === "worker" ? (actor.avatarUrl ?? null) : null,
    },
  });
}

// Trả về reaction hiện tại (null nếu vừa bị bỏ) để client cập nhật UI ngay không cần load lại.
export async function toggleReaction(announcementId: string, actor: Actor, emoji: ReactionKey) {
  const key = actorKeyOf(actor);
  const existing = await prisma.announcementReaction.findUnique({
    where: { announcementId_actorKey: { announcementId, actorKey: key } },
  });
  if (existing && existing.emoji === emoji) {
    await prisma.announcementReaction.delete({ where: { id: existing.id } });
    return null;
  }
  return prisma.announcementReaction.upsert({
    where: { announcementId_actorKey: { announcementId, actorKey: key } },
    update: { emoji, authorName: actor.name },
    create: { announcementId, actorKey: key, actorType: actor.type, emoji, authorName: actor.name },
  });
}

export type SocialAnnouncement = {
  id: string;
  reactionCounts: Partial<Record<ReactionKey, number>>;
  myReaction: ReactionKey | null;
  comments: { id: string; content: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; actorType: string }[];
};

// Gắn reactionCounts/myReaction/comments vào danh sách announcement đã lấy sẵn quan hệ
// reactions+comments (include ở query gọi hàm này) — tránh N+1 query cho từng bài.
export function summarizeSocial<
  T extends { id: string; reactions: { emoji: string; actorKey: string }[]; comments: { id: string; content: string; authorName: string; authorAvatarUrl: string | null; createdAt: Date; actorType: string }[] },
>(items: T[], viewerActorKey: string | null): (T & SocialAnnouncement)[] {
  return items.map((item) => {
    const reactionCounts: Partial<Record<ReactionKey, number>> = {};
    let myReaction: ReactionKey | null = null;
    for (const r of item.reactions) {
      if (isReactionKey(r.emoji)) reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      if (viewerActorKey && r.actorKey === viewerActorKey && isReactionKey(r.emoji)) myReaction = r.emoji;
    }
    return {
      ...item,
      reactionCounts,
      myReaction,
      comments: item.comments.map((c) => ({
        id: c.id,
        content: c.content,
        authorName: c.authorName,
        authorAvatarUrl: c.authorAvatarUrl,
        createdAt: c.createdAt.toISOString(),
        actorType: c.actorType,
      })),
    };
  });
}
