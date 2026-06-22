import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const { currentCode, newCode } = await req.json().catch(() => ({}));

    if (!currentCode || !newCode) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const trimNew = newCode.trim().toLowerCase();

    // Validate format
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(trimNew)) {
      return NextResponse.json(
        { error: "Code chỉ dùng chữ thường, số, dấu gạch ngang. Tối thiểu 3 ký tự." },
        { status: 400 }
      );
    }

    // Tìm affiliate hiện tại
    const affiliate = await prisma.affiliate.findUnique({
      where: { code: currentCode },
      select: { id: true, code: true },
    });
    if (!affiliate) {
      return NextResponse.json({ error: "Không tìm thấy affiliate" }, { status: 404 });
    }

    // Nếu code không đổi
    if (trimNew === affiliate.code) {
      return NextResponse.json({ code: affiliate.code });
    }

    // Kiểm tra code mới có bị trùng không
    const taken = await prisma.affiliate.findUnique({ where: { code: trimNew }, select: { code: true } });
    if (taken) {
      return NextResponse.json({ error: "Code này đã có người dùng" }, { status: 409 });
    }
    const takenHistory = await prisma.affiliateCodeHistory.findUnique({
      where: { oldCode: trimNew },
      select: { oldCode: true },
    });
    if (takenHistory) {
      return NextResponse.json({ error: "Code này đã từng được dùng" }, { status: 409 });
    }

    // Lưu code cũ vào lịch sử, rồi cập nhật (onUpdate: Cascade tự update AffiliateClick)
    await prisma.$transaction([
      prisma.affiliateCodeHistory.create({
        data: { affiliateId: affiliate.id, oldCode: affiliate.code },
      }),
      prisma.affiliate.update({
        where: { id: affiliate.id },
        data: { code: trimNew },
      }),
    ]);

    return NextResponse.json({ code: trimNew });
  } catch (err) {
    console.error("[AffiliateUpdateCode]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
