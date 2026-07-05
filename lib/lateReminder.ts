import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getValidOaToken, sendZaloMessage } from "@/lib/zalo";
import { sendTelegram } from "@/lib/telegram";
import { buildReminderHtml } from "@/lib/chatTools";
import { getTodayString } from "@/lib/utils";
import type { ReminderChannels } from "@/lib/reminderSend";

export interface LateReminderConfig {
  enabled: boolean;
  channels: ReminderChannels;
  delayMinutes: number; // nhắc sau khi quá (giờ vào ca + ân hạn) thêm N phút
  target: "absent_today" | "all"; // giữ cho đồng bộ UI; chế độ này luôn chỉ nhắc người chưa chấm công
  message: string; // dùng {ten} để chèn tên nhân viên
}

export const DEFAULT_LATE_REMINDER: LateReminderConfig = {
  enabled: false,
  channels: { email: true, telegram: true, zalo: false },
  delayMinutes: 10,
  target: "absent_today",
  message: "Chào {ten}, đã đến giờ vào ca mà bạn chưa chấm công. Sếp đang đợi — vui lòng check-in ngay. Cảm ơn!",
};

/** Cửa sổ nhắc: chỉ nhắc trong vòng N phút sau giờ vào ca, tránh nhắc nhầm vào buổi chiều */
const REMIND_WINDOW_MINUTES = 180;

export function sanitizeLateReminderConfig(raw: unknown): LateReminderConfig {
  const r = (raw ?? {}) as Partial<LateReminderConfig> & { channels?: Partial<ReminderChannels> };
  const delay = Math.trunc(Number(r.delayMinutes));
  const message = String(r.message ?? DEFAULT_LATE_REMINDER.message).trim().slice(0, 1000);
  return {
    enabled: Boolean(r.enabled),
    channels: {
      email: Boolean(r.channels?.email),
      telegram: Boolean(r.channels?.telegram),
      zalo: Boolean(r.channels?.zalo),
    },
    delayMinutes: Number.isFinite(delay) && delay >= 0 && delay <= 120 ? delay : DEFAULT_LATE_REMINDER.delayMinutes,
    target: r.target === "all" ? "all" : "absent_today",
    message: message || DEFAULT_LATE_REMINDER.message,
  };
}

export interface LateReminderResult {
  due: number;
  emailSent: number;
  telegramGroups: string[];
  zaloSent: number;
}

interface DueEmployee {
  id: string;
  name: string;
  email: string | null;
  zaloUserId: string | null;
  branchId: string;
}

function parseShift(raw: string | null): { checkInTime?: string; gracePeriod?: number; workDays?: string } {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as { checkInTime?: string; gracePeriod?: number; workDays?: string };
  } catch {
    return {};
  }
}

/**
 * Rà từng nhân viên của 1 công ty: ai đã quá (giờ vào ca + ân hạn + delay) mà chưa check-in,
 * không nghỉ phép, hôm nay là ngày làm việc của họ, và chưa bị nhắc → gửi nhắc riêng.
 * Gọi mỗi ~10 phút bởi cron/late-reminder. Chỉ nhắc 1 lần/người/ngày (bảng LateReminder).
 */
export async function runLateReminders(companyId: string, cfg: LateReminderConfig): Promise<LateReminderResult> {
  const result: LateReminderResult = { due: 0, emailSent: 0, telegramGroups: [], zaloSent: 0 };
  if (!cfg.enabled) return result;
  if (!cfg.channels.email && !cfg.channels.telegram && !cfg.channels.zalo) return result;

  // Giờ + thứ theo giờ VN (UTC+7)
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const nowMinutes = nowVN.getUTCHours() * 60 + nowVN.getUTCMinutes();
  const jsDay = nowVN.getUTCDay(); // 0=CN .. 6=T7
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=T2 .. 7=CN (khớp workDays)
  const today = getTodayString();

  const [employees, logs, leaves, reminded] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: {
        id: true, name: true, email: true, zaloUserId: true, branchId: true, shiftOverride: true,
        branch: { select: { checkInTime: true, gracePeriod: true, workDays: true, name: true, telegramChatId: true } },
      },
    }),
    prisma.attendanceLog.findMany({
      where: { date: today, checkInAt: { not: null }, employee: { companyId } },
      select: { employeeId: true },
    }),
    prisma.leaveRequest.findMany({
      where: { companyId, status: "approved", fromDate: { lte: today }, toDate: { gte: today } },
      select: { employeeId: true },
    }),
    prisma.lateReminder.findMany({ where: { companyId, date: today }, select: { employeeId: true } }),
  ]);

  const checkedIn = new Set(logs.map((l) => l.employeeId));
  const onLeave = new Set(leaves.map((l) => l.employeeId));
  const alreadyReminded = new Set(reminded.map((l) => l.employeeId));

  const due: DueEmployee[] = [];
  // Nhóm tên trễ theo chi nhánh (để đăng Telegram nhóm)
  const branchInfo = new Map<string, { name: string; chatId: string | null; names: string[] }>();

  for (const e of employees) {
    if (!e.branch) continue;
    if (checkedIn.has(e.id)) continue;
    if (onLeave.has(e.id)) continue;
    if (alreadyReminded.has(e.id)) continue;

    const ov = parseShift(e.shiftOverride);
    const checkInTime = ov.checkInTime ?? e.branch.checkInTime; // "HH:MM"
    const gracePeriod = Number.isFinite(ov.gracePeriod) ? Number(ov.gracePeriod) : e.branch.gracePeriod;
    const workDaysStr = ov.workDays ?? e.branch.workDays; // "1,2,3,4,5"
    const workDays = workDaysStr.split(",").map((s) => s.trim());
    if (!workDays.includes(String(isoDay))) continue; // hôm nay không phải ngày làm của họ

    const [h, m] = checkInTime.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const shiftStartMin = h * 60 + m;
    const thresholdMin = shiftStartMin + gracePeriod + cfg.delayMinutes;
    if (nowMinutes < thresholdMin) continue; // chưa tới lúc nhắc
    if (nowMinutes > shiftStartMin + REMIND_WINDOW_MINUTES) continue; // đã quá cửa sổ nhắc

    due.push({ id: e.id, name: e.name, email: e.email, zaloUserId: e.zaloUserId, branchId: e.branchId });
    const bi = branchInfo.get(e.branchId) ?? { name: e.branch.name, chatId: e.branch.telegramChatId, names: [] };
    bi.names.push(e.name);
    branchInfo.set(e.branchId, bi);
  }

  result.due = due.length;
  if (due.length === 0) return result;

  // Đánh dấu đã nhắc TRƯỚC khi gửi → tránh spam nếu cron chạy chồng
  await prisma.lateReminder.createMany({
    data: due.map((d) => ({ companyId, employeeId: d.id, date: today })),
    skipDuplicates: true,
  });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, logoUrl: true,
      zaloOaToken: true, zaloAppId: true, zaloSecretKey: true, zaloRefreshToken: true, zaloTokenExpiresAt: true,
      telegramBotToken: true,
    },
  });
  if (!company) return result;

  const personalText = (name: string) => cfg.message.replace(/\{ten\}/gi, name).trim();

  // EMAIL — từng người
  if (cfg.channels.email) {
    const base = (process.env.NEXTAUTH_URL ?? "https://timio.vn").replace(/\/$/, "");
    const logoUrl = company.logoUrl ? `${base}/api/logo/${company.id}` : null;
    const withEmail = due.filter((d) => d.email).slice(0, 200);
    const res = await Promise.allSettled(
      withEmail.map((d) =>
        sendEmail({
          to: d.email as string,
          subject: "Nhắc chấm công — bạn chưa check-in",
          html: buildReminderHtml(personalText(d.name), company.name, company.name, logoUrl),
        })
      )
    );
    result.emailSent = res.filter((x) => x.status === "fulfilled").length;
  }

  // TELEGRAM — đăng tóm tắt vào nhóm chi nhánh (hệ thống không có DM từng người)
  if (cfg.channels.telegram && company.telegramBotToken) {
    for (const bi of Array.from(branchInfo.values())) {
      if (!bi.chatId) continue;
      const text =
        `⚠️ <b>Chưa chấm công (đã quá giờ vào ca)</b>\n🏢 ${bi.name}\n\n` +
        bi.names.map((n) => `• ${n}`).join("\n");
      try {
        await sendTelegram(company.telegramBotToken, bi.chatId, text);
        result.telegramGroups.push(bi.name);
      } catch { /* non-fatal */ }
    }
  }

  // ZALO — từng follower
  if (cfg.channels.zalo) {
    const followers = due.filter((d) => d.zaloUserId);
    if (followers.length > 0 && (company.zaloOaToken || company.zaloRefreshToken)) {
      const oaToken = await getValidOaToken(company);
      if (oaToken) {
        const res = await Promise.allSettled(
          followers.map((d) => sendZaloMessage({ oaToken, userId: d.zaloUserId as string, text: personalText(d.name) }))
        );
        result.zaloSent = res.filter(
          (x) => x.status === "fulfilled" && (x as PromiseFulfilledResult<{ ok: boolean }>).value.ok
        ).length;
      }
    }
  }

  return result;
}
