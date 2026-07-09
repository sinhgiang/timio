import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { computeWorkerProfile } from "@/lib/workerProfile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const profile = await computeWorkerProfile(id);
  if (!profile) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  return NextResponse.json(profile);
}

// PATCH — chính chủ tự sửa hồ sơ (ảnh bìa, ảnh đại diện, giới thiệu, liên hệ)
export async function PATCH(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | null | boolean> = {};
  // Ảnh: base64 data URL (client đã resize) hoặc null để xoá
  for (const key of ["avatarUrl", "coverUrl"] as const) {
    if (key in body) {
      const val = body[key];
      if (val === null || val === "") data[key] = null;
      else if (typeof val === "string" && val.startsWith("data:image/") && val.length < 3_000_000) data[key] = val;
    }
  }
  // Text ngắn
  const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
  if ("bio" in body) data.bio = clip(body.bio, 300) || null;
  if ("zalo" in body) data.zalo = clip(body.zalo, 120) || null;
  if ("website" in body) data.website = clip(body.website, 200) || null;
  if ("facebook" in body) data.facebook = clip(body.facebook, 200) || null;
  if ("desiredArea" in body) data.desiredArea = clip(body.desiredArea, 100) || null;
  if ("desiredPosition" in body) data.desiredPosition = clip(body.desiredPosition, 100) || null;
  if ("keywords" in body) data.keywords = clip(body.keywords, 300) || null;
  // Công tắc opt-in (bool) — NV tự quyết chia sẻ (Luật 91/2025)
  const boolData: Record<string, boolean> = {};
  for (const k of ["profilePublic", "shareTrustScore", "shareContact", "openToWork", "autoAcceptRecruiters"] as const) {
    if (typeof body[k] === "boolean") boolData[k] = body[k];
  }

  if (Object.keys(data).length === 0 && Object.keys(boolData).length === 0) return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  Object.assign(data, boolData);

  await prisma.workerAccount.update({ where: { id }, data });
  const profile = await computeWorkerProfile(id);
  return NextResponse.json(profile);
}
