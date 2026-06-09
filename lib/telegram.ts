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
