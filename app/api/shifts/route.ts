import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegram } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to   = searchParams.get("to");   // YYYY-MM-DD
  const scopedBranchId = user.role === "manager" && user.branchId ? user.branchId : null;

  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  try {
    const shifts = await prisma.shiftAssignment.findMany({
      where: {
        companyId: user.companyId,
        date: { gte: from, lte: to },
        ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}),
      },
      select: {
        id: true, employeeId: true, date: true,
        shiftLabel: true, checkIn: true, checkOut: true, note: true,
      },
      orderBy: [{ date: "asc" }, { employeeId: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(shifts);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date, shiftLabel, checkIn, checkOut, note } = await req.json();
  if (!employeeId || !date || !shiftLabel || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const emp = await prisma.employee.findFirst({ where: { id: employeeId, companyId: user.companyId } });
  if (!emp) return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });

  try {
    // Use create — multiple shifts per day are now allowed
    const shift = await prisma.shiftAssignment.create({
      data: {
        companyId: user.companyId,
        employeeId,
        date,
        shiftLabel,
        checkIn,
        checkOut,
        note: note || null,
      },
    });

    // Fire-and-forget Telegram notification to branch chat
    try {
      const empWithBranch = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          name: true,
          branch: {
            select: {
              telegramChatId: true,
              company: { select: { telegramBotToken: true } },
            },
          },
        },
      });

      const token = empWithBranch?.branch.company.telegramBotToken;
      const chatId = empWithBranch?.branch.telegramChatId;

      if (token && chatId && empWithBranch) {
        const [y, m] = date.split("-");
        const monthYear = `${m}/${y}`;
        const msg =
          `📅 <b>Lịch ca tháng ${monthYear}</b>\n` +
          `👤 ${empWithBranch.name}\n\n` +
          `${date}: <b>${shiftLabel}</b> (${checkIn} - ${checkOut})\n\n` +
          `🔗 Xem lịch ca: ${process.env.NEXTAUTH_URL ?? "https://timio.vn"}/dashboard/shifts`;
        void sendTelegram(token, chatId, msg);
      }
    } catch {
      // Non-critical — don't block response
    }

    return NextResponse.json(shift, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server — vui lòng thử lại" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Thiếu id ca" }, { status: 400 });

  try {
    // Verify ownership before deleting
    const existing = await prisma.shiftAssignment.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    await prisma.shiftAssignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
}
