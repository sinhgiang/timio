import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, plan, years } = await req.json() as { email: string; plan: string; years?: number };

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { companyId: true },
  });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + (years ?? 5));

  const company = await prisma.company.update({
    where: { id: admin.companyId },
    data: { plan, planExpires: expiry },
    select: { id: true, name: true, slug: true, plan: true, planExpires: true },
  });

  return NextResponse.json({ ok: true, company });
}
