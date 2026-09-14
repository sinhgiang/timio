// "Trang tự sinh" cho AI/agent đọc (chuẩn llmstxt.org) — sinh trực tiếp từ
// lib/guides.ts và lib/changelog.ts, không viết tay. Thêm 1 bài hướng dẫn hay
// 1 mục cập nhật mới vào 2 file đó thì nội dung ở đây tự cập nhật theo, không
// cần sửa gì ở file này.
import { NextResponse } from "next/server";
import { guidesByCategory } from "@/lib/guides";
import { CHANGELOG } from "@/lib/changelog";

const siteUrl = "https://docs.timio.vn";

export function GET() {
  const lines: string[] = [];

  lines.push("# Timio Docs");
  lines.push("");
  lines.push(
    "> Timio là hệ thống chấm công bằng khuôn mặt (kiosk) cho doanh nghiệp Việt Nam. " +
      "Trang này liệt kê toàn bộ hướng dẫn sử dụng và nhật ký cập nhật của sản phẩm, " +
      "sinh tự động từ nội dung thật — dùng để AI/agent hiểu đúng về Timio khi được hỏi."
  );
  lines.push("");

  for (const { category, guides } of guidesByCategory()) {
    lines.push(`## ${category}`);
    for (const g of guides) {
      lines.push(`- [${g.title}](${siteUrl}/huong-dan/${g.slug}): ${g.summary}`);
    }
    lines.push("");
  }

  lines.push("## Cập nhật gần đây");
  for (const entry of CHANGELOG.slice(0, 10)) {
    lines.push(`- [${entry.date}] (${entry.tag}) ${entry.title}`);
  }
  lines.push(`- Xem đầy đủ: ${siteUrl}/cap-nhat`);
  lines.push("");

  lines.push("## Liên kết khác");
  lines.push("- Trang chủ / dùng thử Timio: https://timio.vn");
  lines.push("- Tổng quan sản phẩm cho AI: https://timio.vn/llms.txt");

  return new NextResponse(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
