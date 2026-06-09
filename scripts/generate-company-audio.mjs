// Tạo file âm thanh riêng cho một công ty
// Cách dùng: node scripts/generate-company-audio.mjs <slug>
// Ví dụ:     node scripts/generate-company-audio.mjs trekking-tour-sapa

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOICE = "vi-VN-HoaiMyNeural";

const slug = process.argv[2];
if (!slug) {
  console.error("❌ Thiếu slug! Dùng: node scripts/generate-company-audio.mjs <slug>");
  process.exit(1);
}

const prisma = new PrismaClient();
const company = await prisma.company.findUnique({ where: { slug } });
await prisma.$disconnect();

if (!company) {
  console.error(`❌ Không tìm thấy công ty với slug "${slug}"`);
  process.exit(1);
}

// Lấy messages từ DB, fallback về default nếu không có
const msgs = company.kioskMessages
  ? JSON.parse(company.kioskMessages)
  : {};

// File tĩnh dùng text riêng (không có placeholder {name}/{minutes})
// Sau khi phát file tĩnh, kiosk sẽ gọi speakVi() riêng để đọc tên nhân viên
const phrases = [
  {
    file: "welcome.mp3",
    // Welcome dùng nguyên văn từ DB (không có placeholder)
    text: msgs.welcome ?? `Chào mừng đến với ${company.name}! Vui lòng quét khuôn mặt để điểm danh.`,
  },
  {
    file: "checkin_ontime.mp3",
    // Thông báo thành công, không có tên — tên sẽ được đọc riêng qua TTS
    text: "Check in thành công! Chúc bạn có một ngày làm việc thật vui vẻ và hiệu quả!",
  },
  {
    file: "checkin_late.mp3",
    text: "Check in thành công. Cố gắng đúng giờ hơn vào ngày mai nhé!",
  },
  {
    file: "checkout.mp3",
    text: "Ra ca thành công! Chúc bạn buổi tối thật vui vẻ, hẹn gặp lại!",
  },
];

const outDir = join(__dirname, "..", "public", "audio", slug);
mkdirSync(outDir, { recursive: true });

async function generate({ file, text }) {
  process.stdout.write(`  ${file}: "${text.slice(0, 60)}..." `);
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on("data", (c) => chunks.push(c));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  const buf = Buffer.concat(chunks);
  writeFileSync(join(outDir, file), buf);
  console.log(`OK (${buf.length} bytes)`);
}

console.log(`\n🎙️  Tạo audio cho: ${company.name} (slug: ${slug})`);
console.log(`📁  Output: public/audio/${slug}/\n`);

for (const phrase of phrases) {
  await generate(phrase);
  // Tránh rate limit của msedge-tts
  await new Promise((r) => setTimeout(r, 4000));
}

console.log(`\n✅ Xong! ${phrases.length} files đã lưu vào public/audio/${slug}/`);
