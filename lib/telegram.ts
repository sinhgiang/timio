export async function sendTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Non-critical — don't crash check-in if Telegram fails
  }
}

export function buildLateAlert(employeeName: string, minutesLate: number, branchName: string, penaltyAmount: number): string {
  const penalty = penaltyAmount > 0 ? `\nTiền phạt: <b>${new Intl.NumberFormat("vi-VN").format(penaltyAmount)}đ</b>` : "";
  return `⚠️ <b>Nhân viên đến trễ</b>\n👤 ${employeeName}\n🏢 ${branchName}\n⏰ Trễ ${minutesLate} phút${penalty}`;
}

export function buildLeaveApprovedAlert(params: {
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  note: string | null;
}): string {
  const { employeeName, leaveType, fromDate, toDate, days, note } = params;
  const fmtDate = (s: string) => {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  };
  const dateRange = fromDate === toDate ? fmtDate(fromDate) : `${fmtDate(fromDate)} → ${fmtDate(toDate)}`;

  let msg = `✅ <b>Duyệt nghỉ phép</b>\n👤 ${employeeName}\n📋 ${leaveType}\n📅 ${dateRange} (${days} ngày)`;

  if (note) {
    const keToanLines = note
      .split("\n")
      .filter((l) => l.startsWith("[Kế toán]"))
      .map((l) => l.replace("[Kế toán] ", ""));
    if (keToanLines.length > 0) {
      msg += `\n\n💰 <b>Nhắc kế toán:</b>\n` + keToanLines.map((l) => `• ${l}`).join("\n");
    }
  }

  return msg;
}

export function buildDailyReport(params: {
  branchName: string;
  date: string;
  total: number;
  onTime: number;
  late: number;
  notYet: number;
}): string {
  const { branchName, date, total, onTime, late, notYet } = params;
  return (
    `📊 <b>Báo cáo chấm công</b> — ${date}\n` +
    `🏢 ${branchName}\n\n` +
    `✅ Đúng giờ: <b>${onTime}</b>\n` +
    `⚠️ Đến trễ: <b>${late}</b>\n` +
    `❌ Chưa vào: <b>${notYet}</b>\n` +
    `👥 Tổng: ${total} nhân viên`
  );
}
