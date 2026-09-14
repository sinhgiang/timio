import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const siteUrl = "https://docs.timio.vn";

export const metadata: Metadata = {
  title: {
    default: "Timio Docs — Hướng dẫn sử dụng",
    template: "%s — Timio Docs",
  },
  description:
    "Hướng dẫn sử dụng Timio: chấm công bằng khuôn mặt, quản lý nhân viên & lương, nghỉ phép, báo cáo. Cập nhật tính năng mới nhất.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Timio Docs",
    title: "Timio Docs — Hướng dẫn sử dụng",
    description:
      "Hướng dẫn sử dụng Timio: chấm công bằng khuôn mặt, quản lý nhân viên & lương, nghỉ phép, báo cáo.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Timio Docs",
  url: siteUrl,
  description:
    "Hướng dẫn sử dụng và nhật ký cập nhật của Timio — phần mềm chấm công thông minh cho doanh nghiệp Việt Nam.",
  inLanguage: "vi",
  publisher: { "@type": "Organization", name: "Timio", url: "https://timio.vn" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-white">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
