import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CHANNEL_OPTIONS = ["blog", "youtube", "facebook", "tiktok", "zalo", "consulting", "other"];

export async function PATCH(req: NextRequest) {
  try {
    const { code, name, phone, channel, bankName, bankAccount, accountName } =
      await req.json().catch(() => ({}));

    if (!code) return NextResponse.json({ error: "Thiếu code" }, { status: 400 });
    if (name !== undefined && (!name || name.trim().length < 2)) {
      return NextResponse.json({ error: "Tên phải ít nhất 2 ký tự" }, { status: 400 });
    }
    if (channel !== undefined && channel && !CHANNEL_OPTIONS.includes(channel)) {
      return NextResponse.json({ error: "Kênh không hợp lệ" }, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findUnique({ where: { code }, select: { id: true } });
    if (!affiliate) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    const updated = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        ...(name        !== undefined && { name:        name.trim() }),
        ...(phone       !== undefined && { phone:       phone?.trim() || null }),
        ...(channel     !== undefined && { channel:     channel || null }),
        ...(bankName    !== undefined && { bankName:    bankName?.trim() || null }),
        ...(bankAccount !== undefined && { bankAccount: bankAccount?.trim() || null }),
        ...(accountName !== undefined && { accountName: accountName?.trim() || null }),
      },
      select: { name: true, phone: true, channel: true, bankName: true, bankAccount: true, accountName: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[AffiliateProfile]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
