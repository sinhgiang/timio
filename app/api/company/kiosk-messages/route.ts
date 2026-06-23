import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { welcome, checkinOntime, checkinLate, checkout } = body;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      kioskMessages: JSON.stringify({ welcome, checkinOntime, checkinLate, checkout }),
    },
  });

  return NextResponse.json({ ok: true });
}
