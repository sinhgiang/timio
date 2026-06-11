import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://timio.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Timio — Phần mềm chấm công thông minh",
    template: "%s | Timio",
  },
  description:
    "Hệ thống chấm công thông minh cho doanh nghiệp Việt Nam. Nhận diện khuôn mặt, báo cáo tự động, tính lương chính xác.",
  keywords: [
    "chấm công", "phần mềm chấm công", "máy chấm công", "nhận diện khuôn mặt",
    "quản lý nhân sự", "HR", "timio", "chấm công online", "attendance",
  ],
  authors: [{ name: "Timio" }],
  creator: "Timio",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Timio",
    title: "Timio — Phần mềm chấm công thông minh",
    description:
      "Hệ thống chấm công thông minh cho doanh nghiệp Việt Nam. Nhận diện khuôn mặt, báo cáo tự động.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Timio — Phần mềm chấm công thông minh",
    description: "Hệ thống chấm công thông minh cho doanh nghiệp Việt Nam.",
  },
  verification: { google: "4fe9900be539e21b" },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timio",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Timio",
  description: "Hệ thống chấm công thông minh cho doanh nghiệp Việt Nam",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "vi",
  offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
  url: siteUrl,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
