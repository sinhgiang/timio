import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — cập nhật giới thiệu công ty trên trang tuyển dụng (owner)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role !== "owner") return NextResponse.json({ error: "Chỉ chủ công ty được sửa." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: { careerIntro?: string | null; careerCoverUrl?: string | null; careerPerks?: string | null } = {};

  if (body.careerIntro !== undefined) {
    const v = typeof body.careerIntro === "string" ? body.careerIntro.slice(0, 2000).trim() : "";
    data.careerIntro = v || null;
  }
  if (body.careerCoverUrl !== undefined) {
    const v = typeof body.careerCoverUrl === "string" ? body.careerCoverUrl : "";
    // base64 data URI, giới hạn ~1.5MB
    if (v && (!/^data:image\/(jpeg|png|webp);base64,/.test(v) || v.length > 2_000_000)) {
      return NextResponse.json({ error: "Ảnh bìa không hợp lệ hoặc quá lớn (tối đa ~1.5MB)." }, { status: 400 });
    }
    data.careerCoverUrl = v || null;
  }
  if (body.careerPerks !== undefined) {
    const arr = Array.isArray(body.careerPerks) ? body.careerPerks : [];
    const perks = arr
      .map((p: { icon?: unknown; label?: unknown }) => ({ icon: String(p?.icon ?? "star").slice(0, 20), label: String(p?.label ?? "").trim().slice(0, 40) }))
      .filter((p: { label: string }) => p.label)
      .slice(0, 8);
    data.careerPerks = perks.length ? JSON.stringify(perks) : null;
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  await prisma.company.update({ where: { id: companyId }, data });
  return NextResponse.json({ ok: true });
}
