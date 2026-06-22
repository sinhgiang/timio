import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function toSlug(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

export async function POST(req: NextRequest) {
  const { companyName, email, password, referralCode, affiliateCode, clickId } =
    await req.json().catch(() => ({}));

  if (!companyName || !email || !password) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Mật khẩu phải ít nhất 6 ký tự" }, { status: 400 });
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    return NextResponse.json({ error: "Email này đã được đăng ký" }, { status: 409 });
  }

  // Verify referral code (slug)
  let validReferredBy: string | null = null;
  if (referralCode) {
    const referrer = await prisma.company.findUnique({ where: { slug: referralCode }, select: { slug: true } });
    if (referrer) validReferredBy = referrer.slug;
  }

  // Verify affiliate code — check current code or old codes (AffiliateCodeHistory)
  let validAffiliateCode: string | null = null;
  if (affiliateCode) {
    const aff = await prisma.affiliate.findUnique({ where: { code: affiliateCode }, select: { code: true } });
    if (aff) {
      validAffiliateCode = aff.code;
    } else {
      // Cookie có thể chứa code cũ khi affiliate đã đổi slug
      const history = await prisma.affiliateCodeHistory.findUnique({
        where: { oldCode: affiliateCode },
        include: { affiliate: { select: { code: true } } },
      });
      if (history) validAffiliateCode = history.affiliate.code;
    }
  }

  // Generate unique slug
  let baseSlug = toSlug(companyName) || "cong-ty";
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let companyId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, slug, plan: "starter", referredBy: validReferredBy, affiliateCode: validAffiliateCode },
    });
    companyId = company.id;
    await tx.admin.create({
      data: { companyId: company.id, email, name: companyName, password: hashedPassword, role: "admin" },
    });
    await tx.branch.create({
      data: { companyId: company.id, name: "Văn phòng chính" },
    });
  });

  // Mark affiliate click as converted (outside transaction so failure doesn't roll back registration)
  if (companyId && validAffiliateCode) {
    try {
      if (clickId) {
        // Update specific click by ID (most accurate attribution)
        await prisma.affiliateClick.updateMany({
          where: {
            id: clickId,
            affiliateCode: validAffiliateCode,
            convertedAt: null,
          },
          data: { convertedAt: new Date(), companyId },
        });
      } else {
        // Fallback: update most recent unattributed click for this affiliate
        const recent = await prisma.affiliateClick.findFirst({
          where: { affiliateCode: validAffiliateCode, convertedAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (recent) {
          await prisma.affiliateClick.update({
            where: { id: recent.id },
            data: { convertedAt: new Date(), companyId },
          });
        }
      }
    } catch (err) {
      // Non-fatal — registration already succeeded
      console.error("[Register] Failed to mark affiliate click:", err);
    }
  }

  return NextResponse.json({ success: true, email });
}
