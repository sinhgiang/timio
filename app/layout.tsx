import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
  verification: {
    google: "hUTYywnN-yyQuobwR19O6o5LzCFlTDgxgxw9u3llJkY",
    other: { "zalo-platform-site-verification": "G_Qb9x_xT2euXVXyoOT2Ln_naa_pXqWGDpOp" },
  },
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
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
