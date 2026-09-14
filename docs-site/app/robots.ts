import { MetadataRoute } from "next";

const siteUrl = "https://docs.timio.vn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
