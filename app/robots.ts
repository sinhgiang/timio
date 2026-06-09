import { MetadataRoute } from "next";

const siteUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://timio.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
