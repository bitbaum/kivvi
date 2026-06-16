import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://kivvi.ch";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/settings/", "/intake/", "/sales/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
