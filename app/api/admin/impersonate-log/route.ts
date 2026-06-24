import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isSuperAdmin(session: { user?: unknown } | null) {
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "super_admin";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { companyId, action } = body as { companyId: string; action: string };
  if (!companyId || !["enter", "exit"].includes(action)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  await prisma.impersonationLog.create({
    data: { adminEmail: session.user.email, companyId, action },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const logs = await prisma.impersonationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { company: { select: { name: true, slug: true } } },
  });

  return NextResponse.json(logs);
}
