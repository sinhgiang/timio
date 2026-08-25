/**
 * One-off migration (25/8/2026): "Nhắc chấm công tự động hàng ngày" (autoReminderConfig — giờ cố
 * định + chọn ngày thủ công) đã gộp thành toggle "Trước ca" trong "Nhắc chấm công trước & trễ giờ
 * vào ca" (lateReminderConfig.beforeShift). Script này: với mọi công ty đang BẬT
 * autoReminderConfig, tự bật beforeShift (giữ nội dung tin nhắn cũ nếu có), giữ nguyên các cài đặt
 * "Trễ ca" hiện có (không đụng), rồi TẮT autoReminderConfig.enabled để cron cũ (đã ẩn khỏi UI)
 * không còn coi là bật nữa. KHÔNG xoá dữ liệu — chỉ đổi cờ enabled + thêm field beforeShift.
 *
 * Chạy 1 lần, SAU KHI đã `prisma db push` (bảng PreShiftReminder phải tồn tại trước):
 *   DATABASE_URL="..." npx tsx scripts/migrate-auto-reminder-to-before-shift.ts
 *   (thêm --dry-run để chỉ xem trước, không ghi DB)
 */
import { PrismaClient } from "@prisma/client";
import { sanitizeLateReminderConfig, DEFAULT_LATE_REMINDER, type LateReminderConfig } from "../lib/lateReminder";
import { sanitizeReminderConfig } from "../lib/reminderSend";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const companies = await prisma.company.findMany({
    where: { autoReminderConfig: { not: null } },
    select: { id: true, name: true, autoReminderConfig: true, lateReminderConfig: true },
  });

  console.log(`Tìm thấy ${companies.length} công ty có autoReminderConfig.`);
  let migrated = 0;

  for (const c of companies) {
    let oldCfg;
    try {
      oldCfg = sanitizeReminderConfig(JSON.parse(c.autoReminderConfig as string));
    } catch {
      continue;
    }
    if (!oldCfg.enabled) continue; // đang tắt sẵn thì khỏi cần đụng

    const currentLate: LateReminderConfig = c.lateReminderConfig
      ? sanitizeLateReminderConfig(JSON.parse(c.lateReminderConfig))
      : DEFAULT_LATE_REMINDER;

    if (currentLate.beforeShift.enabled) {
      console.log(`- [BỎ QUA] ${c.name} (${c.id}): đã tự bật "Trước ca" từ trước rồi.`);
      continue;
    }

    const newLate: LateReminderConfig = {
      ...currentLate,
      // Hợp kênh gửi cũ + mới (không mất kênh nào cả 2 bên đã bật)
      channels: {
        email: currentLate.channels.email || oldCfg.channels.email,
        telegram: currentLate.channels.telegram || oldCfg.channels.telegram,
        zalo: currentLate.channels.zalo || oldCfg.channels.zalo,
      },
      beforeShift: {
        enabled: true,
        leadMinutes: 30, // giờ cố định cũ không quy đổi thẳng được sang "trước N phút" per-employee — dùng mặc định 30p
        message: oldCfg.message?.trim()
          ? `Chào {ten}, ${oldCfg.message.replace(/^kính gửi các bạn,?\s*/i, "").trim()}`.replace(/\{ten\}\s*\{ten\}/i, "{ten}")
          : DEFAULT_LATE_REMINDER.beforeShift.message,
      },
    };

    console.log(`- [MIGRATE] ${c.name} (${c.id}): bật "Trước ca" (30 phút trước giờ vào ca của từng người), tắt cấu hình giờ cố định cũ.`);
    migrated++;

    if (!DRY_RUN) {
      await prisma.company.update({
        where: { id: c.id },
        data: {
          lateReminderConfig: JSON.stringify(newLate),
          autoReminderConfig: JSON.stringify({ ...oldCfg, enabled: false }), // giữ lại để đối chiếu, chỉ tắt cờ
        },
      });
    }
  }

  console.log(`${DRY_RUN ? "[DRY RUN] Sẽ" : "Đã"} migrate ${migrated}/${companies.length} công ty.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
