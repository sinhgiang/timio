import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — đọc cấu hình ứng lương của công ty
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const c = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { ewaEnabled: true, ewaApprovalMode: true, ewaMaxPercent: true, ewaFeeType: true, ewaFeeValue: true, ewaMaxPerMonth: true },
  });
  return NextResponse.json(c);
}

// POST — lưu cấu hình (chỉ owner)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Chỉ chủ công ty được đổi cấu hình ứng lương." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.ewaEnabled === "boolean") data.ewaEnabled = body.ewaEnabled;
  if (body.ewaApprovalMode === "manual" || body.ewaApprovalMode === "auto") data.ewaApprovalMode = body.ewaApprovalMode;
  if (body.ewaFeeType === "fixed" || body.ewaFeeType === "percent") data.ewaFeeType = body.ewaFeeType;
  if (Number.isFinite(body.ewaMaxPercent)) data.ewaMaxPercent = Math.min(100, Math.max(1, Math.floor(body.ewaMaxPercent)));
  if (Number.isFinite(body.ewaFeeValue)) data.ewaFeeValue = Math.max(0, Math.floor(body.ewaFeeValue));
  if (Number.isFinite(body.ewaMaxPerMonth)) data.ewaMaxPerMonth = Math.min(31, Math.max(1, Math.floor(body.ewaMaxPerMonth)));

  const updated = await prisma.company.update({
    where: { id: user.companyId },
    data,
    select: { ewaEnabled: true, ewaApprovalMode: true, ewaMaxPercent: true, ewaFeeType: true, ewaFeeValue: true, ewaMaxPerMonth: true },
  });
  return NextResponse.json(updated);
}
