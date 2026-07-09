import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { computeWorkerProfile } from "@/lib/workerProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — hồ sơ CÔNG KHAI theo handle (ai có link cũng xem được phần hồ sơ).
// isOwner=true nếu người xem đang đăng nhập chính là chủ hồ sơ (để client hiện tab riêng tư).
export async function GET(_req: NextRequest, { params }: { params: { handle: string } }) {
  const account = await prisma.workerAccount.findUnique({
    where: { handle: params.handle },
    select: { id: true, activatedAt: true },
  });
  if (!account) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

  const profile = await computeWorkerProfile(account.id);
  if (!profile) return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });

  const viewerId = getWorkerAccountId();
  const isOwner = viewerId === account.id;

  // Chính chủ → xem đầy đủ (kèm settings). Người khác → tôn trọng opt-in (Luật 91/2025).
  if (isOwner) return NextResponse.json({ ...profile, isOwner: true });

  if (!profile.settings.profilePublic) {
    return NextResponse.json({ private: true, isOwner: false, name: profile.name, avatarUrl: profile.avatarUrl, handle: profile.handle });
  }
  // Công khai nhưng lọc theo công tắc TỪNG loại liên hệ; KHÔNG lộ settings cho người ngoài.
  const { settings, ...pub } = profile;
  const s = profile.socials;
  const socials = {
    phone: settings.shareContact ? s.phone : null,
    email: settings.shareEmail ? s.email : null,
    zalo: settings.shareZalo ? s.zalo : null,
    website: settings.shareWebsite ? s.website : null,
    facebook: settings.shareFacebook ? s.facebook : null,
  };
  return NextResponse.json({
    ...pub,
    isOwner: false,
    trust: settings.shareTrustScore ? profile.trust : { score: null, level: "new", levelLabel: "", parts: { punctuality: 0, consistency: 0, tenure: 0 } },
    hideTrust: !settings.shareTrustScore,
    socials,
    hideContact: !Object.values(socials).some(Boolean),
  });
}
