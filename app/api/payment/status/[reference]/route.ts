import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { reference: string } }
) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payment = await prisma.payment.findUnique({
    where: { reference: params.reference },
  });

  if (!payment || payment.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Auto-expire if past deadline
  if (payment.status === "pending" && payment.expiresAt < new Date()) {
    await prisma.payment.update({
      where: { reference: params.reference },
      data: { status: "expired" },
    });
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({ status: payment.status, paidAt: payment.paidAt });
}
