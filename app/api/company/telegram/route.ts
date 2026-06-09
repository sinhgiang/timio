import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { telegramBotToken } = await req.json();
  await prisma.company.update({
    where: { id: companyId },
    data: { telegramBotToken: telegramBotToken || null },
  });
  return NextResponse.json({ ok: true });
}

// Test: gửi tin nhắn thử đến chatId của branch
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await req.json();
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company?.telegramBotToken) return NextResponse.json({ error: "Chưa cấu hình Bot Token" }, { status: 400 });

  await sendTelegram(company.telegramBotToken, chatId, "✅ Kết nối Telegram thành công từ Timio!");
  return NextResponse.json({ ok: true });
}
