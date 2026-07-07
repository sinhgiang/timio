import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTalentToken } from "@/lib/talentToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cựu NV đồng ý / từ chối lời quan tâm (token bảo vệ). Từ chối → hoàn credit cho công ty.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }

  const payload = verifyTalentToken(String(body.token ?? ""));
  if (!payload) return NextResponse.json({ error: "Link đã hết hạn hoặc không hợp lệ." }, { status: 401 });

  const interestId = String(body.interestId ?? "");
  const action = body.action === "accept" ? "accept" : body.action === "decline" ? "decline" : null;
  if (!interestId || !action) return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });

  const profile = await prisma.talentProfile.findUnique({ where: { employeeId: payload.employeeId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  const interest = await prisma.talentInterest.findFirst({
    where: { id: interestId, profileId: profile.id },
    select: { id: true, status: true, companyId: true, chargedCredits: true },
  });
  if (!interest) return NextResponse.json({ error: "Không tìm thấy lời quan tâm." }, { status: 404 });
  if (interest.status !== "pending") return NextResponse.json({ ok: true, already: interest.status });

  if (action === "accept") {
    await prisma.talentInterest.update({ where: { id: interest.id }, data: { status: "accepted", respondedAt: new Date() } });
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  // Từ chối → hoàn credit cho công ty (công bằng, giống TopCV hoàn khi sai)
  await prisma.talentInterest.update({ where: { id: interest.id }, data: { status: "declined", respondedAt: new Date() } });
  if (interest.chargedCredits > 0) {
    await prisma.talentCredit.upsert({
      where: { companyId: interest.companyId },
      create: { companyId: interest.companyId, balance: interest.chargedCredits },
      update: { balance: { increment: interest.chargedCredits } },
    });
  }
  return NextResponse.json({ ok: true, status: "declined", refunded: interest.chargedCredits });
}
