import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getValidOaToken, sendZaloMessage } from "@/lib/zalo";
import { sendTelegram } from "@/lib/telegram";
import { buildReminderHtml } from "@/lib/chatTools";
import { getTodayString } from "@/lib/utils";

export interface ReminderChannels {
  email: boolean;
  telegram: boolean;
  zalo: boolean;
}

export interface ReminderConfig {
  enabled: boolean;
  channels: ReminderChannels;
  times: number[]; // giờ VN 0-23 (tối đa 2)
  days: number[]; // 0=CN .. 6=Thứ 7
  target: "absent_today" | "all";
  subject: string;
  message: string;
}

export const DEFAULT_REMINDER: ReminderConfig = {
  enabled: false,
  channels: { email: true, telegram: true, zalo: false },
  times: [8],
  days: [1, 2, 3, 4, 5, 6],
  target: "absent_today",
  subject: "Nhắc chấm công",
  message: "Kính gửi các bạn, vui lòng check-in chấm công đúng giờ hôm nay. Cảm ơn!",
};

/** Chuẩn hoá + kiểm tra config gửi từ client, trả về config an toàn để lưu */
export function sanitizeReminderConfig(raw: unknown): ReminderConfig {
  const r = (raw ?? {}) as Partial<ReminderConfig> & { channels?: Partial<ReminderChannels> };
  const times = Array.isArray(r.times)
    ? Array.from(new Set(r.times.map((t) => Math.trunc(Number(t))).filter((t) => t >= 0 && t <= 23))).slice(0, 2)
    : [...DEFAULT_REMINDER.times];
  const days = Array.isArray(r.days)
    ? Array.from(new Set(r.days.map((d) => Math.trunc(Number(d))).filter((d) => d >= 0 && d <= 6)))
    : [...DEFAULT_REMINDER.days];
  const message = String(r.message ?? DEFAULT_REMINDER.message).trim().slice(0, 1000);
  return {
    enabled: Boolean(r.enabled),
    channels: {
      email: Boolean(r.channels?.email),
      telegram: Boolean(r.channels?.telegram),
      zalo: Boolean(r.channels?.zalo),
    },
    times: times.length ? times.sort((a, b) => a - b) : [...DEFAULT_REMINDER.times],
    days: days.length ? days.sort((a, b) => a - b) : [...DEFAULT_REMINDER.days],
    target: r.target === "all" ? "all" : "absent_today",
    subject: String(r.subject ?? DEFAULT_REMINDER.subject).trim().slice(0, 150) || DEFAULT_REMINDER.subject,
    message: message || DEFAULT_REMINDER.message,
  };
}

interface CompanyRecipient {
  id: string;
  name: string;
  email: string | null;
  zaloUserId: string | null;
}

async function resolveCompanyRecipients(companyId: string, target: string): Promise<CompanyRecipient[]> {
  const select = { id: true, name: true, email: true, zaloUserId: true } as const;
  if (target === "absent_today") {
    const today = getTodayString();
    const [emps, logs] = await Promise.all([
      prisma.employee.findMany({ where: { companyId, status: "active" }, select }),
      prisma.attendanceLog.findMany({
        where: { date: today, checkInAt: { not: null }, employee: { companyId } },
        select: { employeeId: true },
      }),
    ]);
    const checkedIn = new Set(logs.map((l) => l.employeeId));
    return emps.filter((e) => !checkedIn.has(e.id));
  }
  return prisma.employee.findMany({ where: { companyId, status: "active" }, select });
}

export interface ReminderSendResult {
  matched: number;
  emailSent: number;
  telegramSent: number;
  telegramGroups: string[];
  zaloSent: number;
}

/**
 * Gửi nhắc nhở cho toàn bộ nhân viên 1 công ty qua các kênh được chọn.
 * Email + Zalo(follower) gửi từng người; Telegram đăng vào nhóm chi nhánh.
 * Dùng bởi cron auto-reminder (và có thể tái dùng nơi khác).
 */
export async function sendCompanyReminder(opts: {
  companyId: string;
  senderName?: string;
  target: "absent_today" | "all";
  subject: string;
  message: string;
  channels: ReminderChannels;
}): Promise<ReminderSendResult> {
  const { companyId, target, subject, message, channels } = opts;
  const result: ReminderSendResult = { matched: 0, emailSent: 0, telegramSent: 0, telegramGroups: [], zaloSent: 0 };
  const text = message.trim();
  if (text.length < 3) return result;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, slug: true, logoUrl: true,
      zaloOaToken: true, zaloAppId: true, zaloSecretKey: true, zaloRefreshToken: true, zaloTokenExpiresAt: true,
      telegramBotToken: true,
      branches: { select: { id: true, name: true, telegramChatId: true } },
    },
  });
  if (!company) return result;

  const recipients = await resolveCompanyRecipients(companyId, target);
  result.matched = recipients.length;
  if (recipients.length === 0) return result;

  // EMAIL
  if (channels.email) {
    const base = (process.env.NEXTAUTH_URL ?? "https://timio.vn").replace(/\/$/, "");
    const logoUrl = company.logoUrl ? `${base}/api/logo/${company.id}` : null;
    const checkinUrl = company.slug ? `${base}/go/checkin/${company.slug}` : null;
    const html = buildReminderHtml(text, company.name, opts.senderName ?? company.name, logoUrl, checkinUrl);
    const withEmail = recipients.filter((r) => r.email).slice(0, 200);
    const res = await Promise.allSettled(withEmail.map((r) => sendEmail({ to: r.email as string, subject, html })));
    result.emailSent = res.filter((x) => x.status === "fulfilled").length;
  }

  // TELEGRAM (nhóm chi nhánh)
  if (channels.telegram && company.telegramBotToken) {
    for (const b of company.branches) {
      if (!b.telegramChatId) continue;
      try {
        await sendTelegram(company.telegramBotToken, b.telegramChatId, text);
        result.telegramSent++;
        result.telegramGroups.push(b.name);
      } catch { /* non-fatal */ }
    }
  }

  // ZALO (chỉ follower)
  if (channels.zalo) {
    const followers = recipients.filter((r) => r.zaloUserId);
    if (followers.length > 0 && (company.zaloOaToken || company.zaloRefreshToken)) {
      const oaToken = await getValidOaToken(company);
      if (oaToken) {
        const res = await Promise.allSettled(
          followers.map((r) => sendZaloMessage({ oaToken, userId: r.zaloUserId as string, text }))
        );
        result.zaloSent = res.filter((x) => x.status === "fulfilled" && (x as PromiseFulfilledResult<{ ok: boolean }>).value.ok).length;
      }
    }
  }

  return result;
}
