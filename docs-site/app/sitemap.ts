// "Tự sinh": sitemap kéo thẳng từ GUIDES, thêm bài hướng dẫn mới vào lib/guides.ts
// là tự có mặt trong sitemap, không cần khai báo tay.
import { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";

const siteUrl = "https://docs.timio.vn";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/huong-dan`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/cap-nhat`, changeFrequency: "daily", priority: 0.9 },
    ...GUIDES.map((g) => ({
      url: `${siteUrl}/huong-dan/${g.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
