import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeReminderConfig, DEFAULT_REMINDER } from "@/lib/reminderSend";

function sessionUser(session: unknown) {
  return (session as { user?: { companyId?: string; role?: string } } | null)?.user;
}

// GET — đọc config nhắc chấm công tự động (owner)
export async function GET() {
  const user = sessionUser(await getServerSession(authOptions));
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { autoReminderConfig: true },
  });
  let config = DEFAULT_REMINDER;
  if (company?.autoReminderConfig) {
    try {
      config = sanitizeReminderConfig(JSON.parse(company.autoReminderConfig));
    } catch {
      config = DEFAULT_REMINDER;
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
  const config = sanitizeReminderConfig(body?.config ?? body);

  await prisma.company.update({
    where: { id: user.companyId },
    data: { autoReminderConfig: JSON.stringify(config) },
  });
  return NextResponse.json({ ok: true, config });
}
