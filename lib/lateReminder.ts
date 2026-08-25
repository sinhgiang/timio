import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getValidOaToken, sendZaloMessage } from "@/lib/zalo";
import { sendTelegram } from "@/lib/telegram";
import { buildReminderHtml } from "@/lib/chatTools";
import { getTodayString } from "@/lib/utils";
import { sendExpoPush } from "@/lib/push";
import type { ReminderChannels } from "@/lib/reminderSend";

export interface BeforeShiftConfig {
  enabled: boolean;
  leadMinutes: number; // nhắc trước giờ vào ca bao nhiêu phút
  message: string; // dùng {ten}, {phut} (khi tắt AI thì đây là nội dung gửi thẳng — không có AI riêng cho mục này)
}

export const DEFAULT_BEFORE_SHIFT: BeforeShiftConfig = {
  enabled: false,
  leadMinutes: 30,
  message: "Chào {ten}, còn {phut} phút nữa là tới giờ vào ca. Đừng quên chấm công đúng giờ nhé!",
};

export interface LateReminderConfig {
  enabled: boolean; // BẬT/TẮT nhắc TRỄ ca (giữ tên field cũ để tương thích ngược)
  channels: ReminderChannels; // dùng chung cho cả nhắc trước ca lẫn nhắc trễ ca
  delayMinutes: number; // nhắc sau khi quá (giờ vào ca + ân hạn) thêm N phút
  target: "absent_today" | "all"; // giữ cho đồng bộ UI; chế độ này luôn chỉ nhắc người chưa chấm công
  useAI: boolean; // để AI tự soạn tin nhắc TRỄ ca (ấm áp, có ngày/thứ), tự chèn {ten}
  message: string; // dùng {ten} để chèn tên nhân viên (khi tắt AI) — nội dung nhắc TRỄ ca
  beforeShift: BeforeShiftConfig; // nhắc TRƯỚC giờ vào ca — bật/tắt độc lập với nhắc trễ ca
}

export const DEFAULT_LATE_REMINDER: LateReminderConfig = {
  enabled: false,
  channels: { email: true, telegram: true, zalo: false },
  delayMinutes: 10,
  target: "absent_today",
  useAI: false,
  message: "Chào {ten}, đã đến giờ vào ca mà bạn chưa chấm công. Sếp đang đợi — vui lòng check-in ngay. Cảm ơn!",
  beforeShift: DEFAULT_BEFORE_SHIFT,
};

/** Cửa sổ nhắc: chỉ nhắc trong vòng N phút sau giờ vào ca, tránh nhắc nhầm vào buổi chiều */
const REMIND_WINDOW_MINUTES = 180;

function sanitizeBeforeShift(raw: unknown): BeforeShiftConfig {
  const r = (raw ?? {}) as Partial<BeforeShiftConfig>;
  const lead = Math.trunc(Number(r.leadMinutes));
  const message = String(r.message ?? DEFAULT_BEFORE_SHIFT.message).trim().slice(0, 1000);
  return {
    enabled: Boolean(r.enabled),
    leadMinutes: Number.isFinite(lead) && lead >= 5 && lead <= 180 ? lead : DEFAULT_BEFORE_SHIFT.leadMinutes,
    message: message || DEFAULT_BEFORE_SHIFT.message,
  };
}

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
    useAI: Boolean(r.useAI),
    message: message || DEFAULT_LATE_REMINDER.message,
    beforeShift: sanitizeBeforeShift(r.beforeShift),
  };
}

export interface LateReminderResult {
  due: number;
  emailSent: number;
  telegramGroups: string[];
  zaloSent: number;
  pushSent: number;
  skippedHoliday?: string;
}

interface DueEmployee {
  id: string;
  name: string;
  email: string | null;
  zaloUserId: string | null;
  pushToken: string | null;
  branchId: string;
}

interface ParsedShift {
  checkInTime?: string;
  gracePeriod?: number;
  workDays?: string;
  // Ngày làm khác (lặp lại theo thứ, vd nhân viên ca gãy nhưng cứ T5 làm ca thường thay đồng
  // nghiệp nghỉ) — xem lib/shiftResolve.ts (findDayOverride). Ở đây tự đối chiếu theo jsDay
  // thay vì gọi findDayOverride() vì nowVN truyền vào hàm này đã cộng sẵn +7h (giờ VN).
  dayOverrides?: { day: number; checkInTime: string; checkOutTime: string; gracePeriod?: number }[];
}

function parseShift(raw: string | null): ParsedShift {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ParsedShift;
  } catch {
    return {};
  }
}

interface ResolvedShift {
  checkInTime: string; // "HH:MM"
  gracePeriod: number;
}

/**
 * Giờ vào ca HÔM NAY của 1 nhân viên — dùng chung cho cả nhắc trước ca lẫn nhắc trễ ca.
 * Ưu tiên: Ngày làm khác (dayOverrides) > Ca theo ngày (Lịch phân ca) > Lịch tuần (giờ riêng NV → mặc định chi nhánh).
 * Trả về null nếu hôm nay là ngày nghỉ của người này (không cần nhắc gì cả).
 */
function resolveTodayShift(
  e: { shiftOverride: string | null; branch: { checkInTime: string; gracePeriod: number; workDays: string } },
  jsDay: number,
  isoDay: number,
  roster: { shiftLabel: string; checkIn: string }[] | undefined
): ResolvedShift | null {
  const ov = parseShift(e.shiftOverride);
  const dayOverride = ov.dayOverrides?.find((d) => d.day === jsDay);
  const gracePeriod = dayOverride?.gracePeriod
    ?? (Number.isFinite(ov.gracePeriod) ? Number(ov.gracePeriod) : e.branch.gracePeriod);

  let checkInTime: string;
  if (dayOverride) {
    // Ngày làm khác — giờ riêng của ngày này ưu tiên tuyệt đối, bỏ qua ca gãy/lịch phân ca hôm đó
    // (khớp thứ tự ưu tiên đã dùng khi chấm công thật, xem app/api/attendance/*)
    checkInTime = dayOverride.checkInTime;
  } else if (roster && roster.length > 0) {
    // Có phân ca hôm nay → ca theo ngày là nguồn chuẩn
    const workShifts = roster.filter((r) => r.shiftLabel !== "Nghỉ" && /^\d{1,2}:\d{2}$/.test(r.checkIn));
    if (workShifts.length === 0) return null; // hôm nay được xếp nghỉ
    checkInTime = workShifts.map((r) => r.checkIn).sort()[0]; // ca sớm nhất trong ngày
  } else {
    // Không phân ca → dùng lịch tuần (giờ riêng của NV → mặc định chi nhánh)
    const workDaysStr = ov.workDays ?? e.branch.workDays; // "1,2,3,4,5"
    const workDays = workDaysStr.split(",").map((s) => s.trim());
    if (!workDays.includes(String(isoDay))) return null; // hôm nay không phải ngày làm của họ
    checkInTime = ov.checkInTime ?? e.branch.checkInTime; // "HH:MM"
  }
  return { checkInTime, gracePeriod };
}

const VN_WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Nhờ AI soạn 1 tin nhắc (ấm áp mà dứt khoát, có ngày/thứ), chứa {ten} để chèn tên. Lỗi/không key → null. */
async function generateAiMessage(companyName: string, nowVN: Date): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const dateStr = `${VN_WEEKDAYS[nowVN.getUTCDay()]}, ${String(nowVN.getUTCDate()).padStart(2, "0")}/${String(nowVN.getUTCMonth() + 1).padStart(2, "0")}/${nowVN.getUTCFullYear()}`;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await anthropic.messages.create({
      model: process.env.CHAT_MODEL ?? "claude-haiku-4-5",
      max_tokens: 220,
      system:
        "Bạn là trợ lý nhân sự viết tin nhắc chấm công cho nhân viên Việt Nam. Viết 1 tin NGẮN (1–2 câu), giọng tích cực ấm áp nhưng vẫn dứt khoát để nhân viên hiểu cần vào chấm công NGAY. " +
        "Bắt buộc dùng đúng chuỗi {ten} (không đổi) làm chỗ chèn tên. Có thể nhắc tới ngày/thứ hôm nay một cách tự nhiên. Không dùng emoji, không xưng hô suồng sã, không thêm chú thích. Chỉ trả về đúng nội dung tin nhắn.",
      messages: [
        {
          role: "user",
          content: `Hôm nay là ${dateStr}. Công ty: ${companyName}. Nhân viên {ten} chưa chấm công dù đã quá giờ vào ca. Viết tin nhắc.`,
        },
      ],
    });
    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    if (!text) return null;
    return text.includes("{ten}") ? text : `{ten} ơi, ${text}`;
  } catch {
    return null;
  }
}

interface DueComputation {
  holidayName: string | null;
  due: DueEmployee[];
  branchInfo: Map<string, { name: string; chatId: string | null; names: string[] }>;
}

/**
 * TÍNH (không gửi) ai đến hạn nhắc, tại thời điểm nowVN cho trước. Tách riêng để test được.
 * Ưu tiên ca theo ngày (Lịch phân ca); "Nghỉ" hoặc ngày lễ hoặc nghỉ phép → bỏ qua.
 */
export async function computeDueEmployees(
  companyId: string,
  cfg: LateReminderConfig,
  nowVN: Date
): Promise<DueComputation> {
  const nowMinutes = nowVN.getUTCHours() * 60 + nowVN.getUTCMinutes();
  const jsDay = nowVN.getUTCDay(); // 0=CN .. 6=T7
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=T2 .. 7=CN (khớp workDays)
  const today = nowVN.toISOString().slice(0, 10); // YYYY-MM-DD theo giờ VN (nowVN đã +7h)

  const branchInfo = new Map<string, { name: string; chatId: string | null; names: string[] }>();

  // Ngày lễ toàn công ty → không nhắc ai cả
  const holiday = await prisma.holiday.findFirst({ where: { companyId, date: today }, select: { name: true } });
  if (holiday) return { holidayName: holiday.name, due: [], branchInfo };

  const [employees, logs, leaves, reminded, assignments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: {
        id: true, name: true, email: true, zaloUserId: true, pushToken: true, branchId: true, shiftOverride: true,
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
    prisma.shiftAssignment.findMany({
      where: { companyId, date: today },
      select: { employeeId: true, shiftLabel: true, checkIn: true },
    }),
  ]);

  const checkedIn = new Set(logs.map((l) => l.employeeId));
  const onLeave = new Set(leaves.map((l) => l.employeeId));
  const alreadyReminded = new Set(reminded.map((l) => l.employeeId));

  // Ca theo ngày (Lịch phân ca) — có thể nhiều ca/ngày
  const assignMap = new Map<string, { shiftLabel: string; checkIn: string }[]>();
  for (const a of assignments) {
    const arr = assignMap.get(a.employeeId) ?? [];
    arr.push({ shiftLabel: a.shiftLabel, checkIn: a.checkIn });
    assignMap.set(a.employeeId, arr);
  }

  const due: DueEmployee[] = [];

  for (const e of employees) {
    if (!e.branch) continue;
    if (checkedIn.has(e.id)) continue;
    if (onLeave.has(e.id)) continue;
    if (alreadyReminded.has(e.id)) continue;

    const shift = resolveTodayShift(e, jsDay, isoDay, assignMap.get(e.id));
    if (!shift) continue; // hôm nay là ngày nghỉ của người này

    const [h, m] = shift.checkInTime.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const shiftStartMin = h * 60 + m;
    const thresholdMin = shiftStartMin + shift.gracePeriod + cfg.delayMinutes;
    if (nowMinutes < thresholdMin) continue; // chưa tới lúc nhắc
    if (nowMinutes > shiftStartMin + REMIND_WINDOW_MINUTES) continue; // đã quá cửa sổ nhắc

    due.push({ id: e.id, name: e.name, email: e.email, zaloUserId: e.zaloUserId, pushToken: e.pushToken, branchId: e.branchId });
    const bi = branchInfo.get(e.branchId) ?? { name: e.branch.name, chatId: e.branch.telegramChatId, names: [] };
    bi.names.push(e.name);
    branchInfo.set(e.branchId, bi);
  }

  return { holidayName: null, due, branchInfo };
}

interface SendBatchOptions {
  companyId: string;
  due: DueEmployee[];
  branchInfo: Map<string, { name: string; chatId: string | null; names: string[] }>;
  channels: ReminderChannels;
  buildPersonalText: (name: string) => string;
  emailSubject: string;
  telegramTitle: string; // vd "⚠️ Chưa chấm công (đã quá giờ vào ca)"
  pushTitle: string;
  pushBody: string;
  pushType: string;
}

/** Gửi 1 đợt nhắc (email/telegram/zalo/push) — dùng chung cho nhắc trước ca lẫn nhắc trễ ca */
async function sendReminderBatch(opts: SendBatchOptions): Promise<Omit<LateReminderResult, "due" | "skippedHoliday">> {
  const result = { emailSent: 0, telegramGroups: [] as string[], zaloSent: 0, pushSent: 0 };
  const { companyId, due, branchInfo, channels, buildPersonalText } = opts;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true, name: true, slug: true, logoUrl: true,
      zaloOaToken: true, zaloAppId: true, zaloSecretKey: true, zaloRefreshToken: true, zaloTokenExpiresAt: true,
      telegramBotToken: true,
    },
  });
  if (!company) return result;

  // EMAIL — từng người
  if (channels.email) {
    const base = (process.env.NEXTAUTH_URL ?? "https://timio.vn").replace(/\/$/, "");
    const logoUrl = company.logoUrl ? `${base}/api/logo/${company.id}` : null;
    const checkinUrl = company.slug ? `${base}/go/checkin/${company.slug}` : null;
    const withEmail = due.filter((d) => d.email).slice(0, 200);
    const res = await Promise.allSettled(
      withEmail.map((d) =>
        sendEmail({
          to: d.email as string,
          subject: opts.emailSubject,
          html: buildReminderHtml(buildPersonalText(d.name), company.name, company.name, logoUrl, checkinUrl),
        })
      )
    );
    result.emailSent = res.filter((x) => x.status === "fulfilled").length;
  }

  // TELEGRAM — đăng tóm tắt vào nhóm chi nhánh (hệ thống không có DM từng người)
  if (channels.telegram && company.telegramBotToken) {
    for (const bi of Array.from(branchInfo.values())) {
      if (!bi.chatId) continue;
      const text = `${opts.telegramTitle}\n🏢 ${bi.name}\n\n` + bi.names.map((n) => `• ${n}`).join("\n");
      try {
        await sendTelegram(company.telegramBotToken, bi.chatId, text);
        result.telegramGroups.push(bi.name);
      } catch { /* non-fatal */ }
    }
  }

  // ZALO — từng follower
  if (channels.zalo) {
    const followers = due.filter((d) => d.zaloUserId);
    if (followers.length > 0 && (company.zaloOaToken || company.zaloRefreshToken)) {
      const oaToken = await getValidOaToken(company);
      if (oaToken) {
        const res = await Promise.allSettled(
          followers.map((d) => sendZaloMessage({ oaToken, userId: d.zaloUserId as string, text: buildPersonalText(d.name) }))
        );
        result.zaloSent = res.filter(
          (x) => x.status === "fulfilled" && (x as PromiseFulfilledResult<{ ok: boolean }>).value.ok
        ).length;
      }
    }
  }

  // PUSH — thông báo đẩy tới app cho ai đã cài app + bật thông báo (không cần bật kênh riêng)
  const pushTokens = due.map((d) => d.pushToken);
  if (pushTokens.some(Boolean)) {
    result.pushSent = await sendExpoPush(pushTokens, opts.pushTitle, opts.pushBody, { type: opts.pushType });
  }

  return result;
}

/**
 * Rà + GỬI nhắc chấm công trễ cho 1 công ty. Gọi mỗi ~10 phút bởi cron/late-reminder.
 * Bỏ qua ngày lễ / nghỉ phép / ngày nghỉ; ưu tiên ca theo ngày; chỉ nhắc 1 lần/người/ngày.
 */
export async function runLateReminders(companyId: string, cfg: LateReminderConfig): Promise<LateReminderResult> {
  const result: LateReminderResult = { due: 0, emailSent: 0, telegramGroups: [], zaloSent: 0, pushSent: 0 };
  if (!cfg.enabled) return result;
  if (!cfg.channels.email && !cfg.channels.telegram && !cfg.channels.zalo) return result;

  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const today = nowVN.toISOString().slice(0, 10);

  const { holidayName, due, branchInfo } = await computeDueEmployees(companyId, cfg, nowVN);
  if (holidayName) return { ...result, skippedHoliday: holidayName };
  result.due = due.length;
  if (due.length === 0) return result;

  // Đánh dấu đã nhắc TRƯỚC khi gửi → tránh spam nếu cron chạy chồng
  await prisma.lateReminder.createMany({
    data: due.map((d) => ({ companyId, employeeId: d.id, date: today })),
    skipDuplicates: true,
  });

  // Nội dung: AI tự soạn (nếu bật) → nếu lỗi thì dùng nội dung cấu hình
  let template = cfg.message;
  if (cfg.useAI) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    const ai = company ? await generateAiMessage(company.name, nowVN) : null;
    if (ai) template = ai;
  }
  const personalText = (name: string) => template.replace(/\{ten\}/gi, name).trim();

  const sent = await sendReminderBatch({
    companyId,
    due,
    branchInfo,
    channels: cfg.channels,
    buildPersonalText: personalText,
    emailSubject: "Nhắc chấm công — bạn chưa check-in",
    telegramTitle: "⚠️ <b>Chưa chấm công (đã quá giờ vào ca)</b>",
    pushTitle: "Nhắc chấm công",
    pushBody: "Bạn chưa chấm công hôm nay — mở app để check-in ngay nhé.",
    pushType: "late_reminder",
  });

  return { ...result, ...sent };
}

/**
 * TÍNH (không gửi) ai sắp tới giờ vào ca (trong vòng leadMinutes) mà chưa chấm công.
 * Dùng chung logic phân giải ca với computeDueEmployees — chỉ khác cửa sổ thời gian.
 */
export async function computeDuePreShift(
  companyId: string,
  cfg: LateReminderConfig,
  nowVN: Date
): Promise<DueComputation> {
  const nowMinutes = nowVN.getUTCHours() * 60 + nowVN.getUTCMinutes();
  const jsDay = nowVN.getUTCDay(); // 0=CN .. 6=T7
  const isoDay = jsDay === 0 ? 7 : jsDay; // 1=T2 .. 7=CN (khớp workDays)
  const today = nowVN.toISOString().slice(0, 10); // YYYY-MM-DD theo giờ VN (nowVN đã +7h)

  const branchInfo = new Map<string, { name: string; chatId: string | null; names: string[] }>();
  const leadMinutes = cfg.beforeShift.leadMinutes;

  // Ngày lễ toàn công ty → không nhắc ai cả
  const holiday = await prisma.holiday.findFirst({ where: { companyId, date: today }, select: { name: true } });
  if (holiday) return { holidayName: holiday.name, due: [], branchInfo };

  const [employees, logs, leaves, reminded, assignments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: {
        id: true, name: true, email: true, zaloUserId: true, pushToken: true, branchId: true, shiftOverride: true,
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
    prisma.preShiftReminder.findMany({ where: { companyId, date: today }, select: { employeeId: true } }),
    prisma.shiftAssignment.findMany({
      where: { companyId, date: today },
      select: { employeeId: true, shiftLabel: true, checkIn: true },
    }),
  ]);

  const checkedIn = new Set(logs.map((l) => l.employeeId));
  const onLeave = new Set(leaves.map((l) => l.employeeId));
  const alreadyReminded = new Set(reminded.map((l) => l.employeeId));

  const assignMap = new Map<string, { shiftLabel: string; checkIn: string }[]>();
  for (const a of assignments) {
    const arr = assignMap.get(a.employeeId) ?? [];
    arr.push({ shiftLabel: a.shiftLabel, checkIn: a.checkIn });
    assignMap.set(a.employeeId, arr);
  }

  const due: DueEmployee[] = [];

  for (const e of employees) {
    if (!e.branch) continue;
    if (checkedIn.has(e.id)) continue; // đã chấm công rồi thì khỏi nhắc trước
    if (onLeave.has(e.id)) continue;
    if (alreadyReminded.has(e.id)) continue;

    const shift = resolveTodayShift(e, jsDay, isoDay, assignMap.get(e.id));
    if (!shift) continue; // hôm nay là ngày nghỉ của người này

    const [h, m] = shift.checkInTime.split(":").map((x) => Number(x));
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const shiftStartMin = h * 60 + m;
    const thresholdMin = shiftStartMin - leadMinutes;
    if (nowMinutes < thresholdMin) continue; // chưa tới lúc nhắc
    if (nowMinutes >= shiftStartMin) continue; // đã tới/qua giờ vào ca → nhường cho nhắc trễ ca

    due.push({ id: e.id, name: e.name, email: e.email, zaloUserId: e.zaloUserId, pushToken: e.pushToken, branchId: e.branchId });
    const bi = branchInfo.get(e.branchId) ?? { name: e.branch.name, chatId: e.branch.telegramChatId, names: [] };
    bi.names.push(e.name);
    branchInfo.set(e.branchId, bi);
  }

  return { holidayName: null, due, branchInfo };
}

/**
 * Rà + GỬI nhắc TRƯỚC giờ vào ca cho 1 công ty. Gọi mỗi ~10 phút bởi cron/late-reminder
 * (cùng chỗ với nhắc trễ ca). Bỏ qua ngày lễ / nghỉ phép / ngày nghỉ; chỉ nhắc 1 lần/người/ngày.
 */
export async function runPreShiftReminders(companyId: string, cfg: LateReminderConfig): Promise<LateReminderResult> {
  const result: LateReminderResult = { due: 0, emailSent: 0, telegramGroups: [], zaloSent: 0, pushSent: 0 };
  if (!cfg.beforeShift.enabled) return result;
  if (!cfg.channels.email && !cfg.channels.telegram && !cfg.channels.zalo) return result;

  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const today = nowVN.toISOString().slice(0, 10);

  const { holidayName, due, branchInfo } = await computeDuePreShift(companyId, cfg, nowVN);
  if (holidayName) return { ...result, skippedHoliday: holidayName };
  result.due = due.length;
  if (due.length === 0) return result;

  // Đánh dấu đã nhắc TRƯỚC khi gửi → tránh spam nếu cron chạy chồng
  await prisma.preShiftReminder.createMany({
    data: due.map((d) => ({ companyId, employeeId: d.id, date: today })),
    skipDuplicates: true,
  });

  const lead = cfg.beforeShift.leadMinutes;
  const template = cfg.beforeShift.message;
  const personalText = (name: string) => template.replace(/\{ten\}/gi, name).replace(/\{phut\}/gi, String(lead)).trim();

  const sent = await sendReminderBatch({
    companyId,
    due,
    branchInfo,
    channels: cfg.channels,
    buildPersonalText: personalText,
    emailSubject: "Nhắc chấm công — sắp tới giờ vào ca",
    telegramTitle: `⏰ <b>Sắp tới giờ vào ca (còn ~${lead} phút)</b>`,
    pushTitle: "Sắp tới giờ vào ca",
    pushBody: `Còn khoảng ${lead} phút nữa là tới giờ vào ca — đừng quên chấm công nhé.`,
    pushType: "pre_shift_reminder",
  });

  return { ...result, ...sent };
}
