import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "Timio Docs — Hướng dẫn sử dụng",
    template: "%s — Timio Docs",
  },
  description:
    "Hướng dẫn sử dụng Timio: chấm công bằng khuôn mặt, quản lý nhân viên & lương, nghỉ phép, báo cáo. Cập nhật tính năng mới nhất.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
