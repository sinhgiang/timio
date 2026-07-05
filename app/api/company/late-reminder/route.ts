import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeLateReminderConfig, DEFAULT_LATE_REMINDER } from "@/lib/lateReminder";

function sessionUser(session: unknown) {
  return (session as { user?: { companyId?: string; role?: string } } | null)?.user;
}

// GET — đọc config nhắc chấm công trễ theo ca
export async function GET() {
  const user = sessionUser(await getServerSession(authOptions));
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { lateReminderConfig: true },
  });
  let config = DEFAULT_LATE_REMINDER;
  if (company?.lateReminderConfig) {
    try {
      config = sanitizeLateReminderConfig(JSON.parse(company.lateReminderConfig));
    } catch {
      config = DEFAULT_LATE_REMINDER;
    }
  }
  return NextResponse.json({ config });
}

// POST — lưu config (chỉ owner)
export async function POST(req: Request) {
  const user = sessionUser(await getServerSession(authOptions));
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Chỉ chủ tài khoản mới chỉnh được" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const config = sanitizeLateReminderConfig(body?.config ?? body);

  await prisma.company.update({
    where: { id: user.companyId },
    data: { lateReminderConfig: JSON.stringify(config) },
  });
  return NextResponse.json({ ok: true, config });
}
