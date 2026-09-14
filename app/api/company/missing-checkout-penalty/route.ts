import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Số tiền phạt cố định khi NV quên chấm công ra (0 = tắt) — xem
// app/api/cron/missing-checkout-penalty. Yêu cầu user 14/9/2026.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missingCheckoutPenaltyAmount } = await req.json();
  const amount = parseInt(missingCheckoutPenaltyAmount);
  if (isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "Số tiền phạt không hợp lệ" }, { status: 400 });
  }

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { missingCheckoutPenaltyAmount: amount },
      select: { missingCheckoutPenaltyAmount: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi lưu — vui lòng chạy SQL migration" }, { status: 500 });
  }
}
