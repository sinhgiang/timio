// Tổng quan sản phẩm cho AI/agent đọc (chuẩn llmstxt.org). File này chỉ liệt kê
// tổng quan ngắn gọn, chi tiết đầy đủ nằm ở docs.timio.vn/llms.txt (trang đó tự
// sinh từ nội dung hướng dẫn thật, nên luôn cập nhật theo tính năng mới).
import { NextResponse } from "next/server";

const siteUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://timio.vn";

export function GET() {
  const lines: string[] = [
    "# Timio",
    "",
    "> Timio là phần mềm chấm công thông minh cho doanh nghiệp Việt Nam. " +
      "Nhân viên chấm công bằng nhận diện khuôn mặt qua kiosk (điện thoại/máy tính bảng), " +
      "chủ doanh nghiệp và kế toán xem báo cáo, tính lương, quản lý nghỉ phép trên dashboard web.",
    "",
    "## Sản phẩm",
    `- [Trang chủ](${siteUrl}): Giới thiệu Timio, đăng ký dùng thử`,
    `- [Đăng nhập](${siteUrl}/login): Đăng nhập dashboard quản lý`,
    "",
    "## Tính năng chính",
    "- Chấm công bằng nhận diện khuôn mặt (kiosk PWA, không cần vân tay/thẻ từ)",
    "- Dashboard cho chủ doanh nghiệp/kế toán: báo cáo chấm công theo ngày/tháng/phòng ban",
    "- Tính lương tự động theo giờ công, tăng ca, đi trễ/về sớm, ngày lễ/Tết",
    "- Quản lý đơn từ: nghỉ phép, về sớm, đến muộn, sửa chấm công, tăng ca (nhân viên tự tạo, sếp duyệt)",
    "- Quản lý nhân viên, chi nhánh, phân quyền theo vai trò",
    "- Xuất báo cáo/phiếu lương Excel",
    "- App nhân viên (/ho-so): xem lịch sử chấm công, tạo đơn từ, lịch ca trong tháng",
    "",
    "## Tài liệu đầy đủ (cho AI/agent)",
    `- [Timio Docs — llms.txt](https://docs.timio.vn/llms.txt): Toàn bộ hướng dẫn sử dụng và nhật ký cập nhật, sinh tự động từ nội dung thật`,
    `- [Timio Docs](https://docs.timio.vn): Trang hướng dẫn sử dụng dành cho người dùng`,
    "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
