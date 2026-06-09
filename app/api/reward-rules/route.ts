import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, condition, amount } = await req.json();
  const rule = await prisma.rewardRule.create({
    data: { companyId, label: String(label), condition: String(condition), amount: Number(amount) },
  });
  return NextResponse.json(rule, { status: 201 });
}
