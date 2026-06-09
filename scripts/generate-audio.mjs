// Chạy 1 lần để generate static audio files: node scripts/generate-audio.mjs
// Output: public/audio/*.mp3

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "audio");

mkdirSync(OUT_DIR, { recursive: true });

const VOICE = "vi-VN-HoaiMyNeural";

const phrases = [
  {
    file: "welcome.mp3",
    text: "Chào mừng! Vui lòng quét khuôn mặt để điểm danh.",
  },
  {
    file: "checkin_ontime.mp3",
    text: "Tuyệt vời! Bạn đã check in đúng giờ. Chúc bạn có một ngày làm việc tràn đầy năng lượng!",
  },
  {
    file: "checkin_late.mp3",
    text: "Bạn đã check in thành công. Chú ý giờ giấc nhé!",
  },
  {
    file: "checkout.mp3",
    text: "Bạn đã ra ca thành công. Chúc bạn có một thời gian nghỉ thật tuyệt vời!",
  },
  {
    file: "no_face.mp3",
    text: "Không nhận ra khuôn mặt. Vui lòng nhìn thẳng vào camera và đảm bảo đủ ánh sáng.",
  },
  {
    file: "no_match.mp3",
    text: "Khuôn mặt không khớp với nhân viên nào. Vui lòng liên hệ quản lý để được hỗ trợ.",
  },
];

async function generate({ file, text }) {
  process.stdout.write(`Generating ${file}... `);
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on("data", (chunk) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  const buf = Buffer.concat(chunks);
  writeFileSync(join(OUT_DIR, file), buf);
  console.log(`OK (${buf.length} bytes)`);
}

for (const phrase of phrases) {
  await generate(phrase);
}

console.log(`\nDone! ${phrases.length} files saved to public/audio/`);
