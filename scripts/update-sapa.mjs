// Script chạy 1 lần: cập nhật Sapa company messages + slug
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const messages = JSON.stringify({
  welcome:
    "Chào mừng đến với Trekking Tour Sapa! Vui lòng quét khuôn mặt để điểm danh.",
  checkinOntime:
    "Cảm ơn {name} đã đến đúng giờ! Chúc bạn có một ngày làm việc thật vui vẻ và hiệu quả!",
  checkinLate:
    "Cảm ơn {name}! Bạn trễ {minutes} phút hôm nay. Cố gắng đúng giờ hơn vào ngày mai nhé!",
  checkout:
    "Cảm ơn {name} đã hoàn thành công việc hôm nay! Chúc bạn buổi tối thật vui vẻ, hẹn gặp lại!",
});

await prisma.company.update({
  where: { slug: "sapa" },
  data: {
    slug: "trekking-tour-sapa",
    kioskMessages: messages,
  },
});

console.log("✅ Cập nhật xong!");
console.log("   Kiosk mới: http://localhost:3000/checkin/trekking-tour-sapa");

await prisma.$disconnect();
