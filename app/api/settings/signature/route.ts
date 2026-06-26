import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { field, value } = body as { field: "signatureUrl" | "stampUrl"; value: string | null };

  if (field !== "signatureUrl" && field !== "stampUrl") {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Chữ ký số & Dấu công ty chỉ có trong gói Business" }, { status: 403 });
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { [field]: value ?? null },
    select: { signatureUrl: true, stampUrl: true },
  });

  return NextResponse.json(updated);
}
