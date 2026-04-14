import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/content/knowledge";
import { VERTICALS } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXTAUTH_URL ?? "https://kivvi.ch").replace(
    /\/$/,
    "",
  );

  const url = (path: string) => `${base}${path}`;
  const now = new Date();

  // ── Static landing pages ──────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: url("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: url("/how-it-works"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/why-kivvi"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/circular-economy"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: url("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/knowledge"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    // Auth
    { url: url("/register"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: url("/login"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    // Legal
    { url: url("/impressum"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: url("/datenschutz"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // ── Vertical-specific pages ───────────────────────────────────────────────
  const verticalPages: MetadataRoute.Sitemap = VERTICALS.map((v) => ({
    url: url(v.href),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // ── Knowledge articles (dynamic from .md files) ───────────────────────────
  const articlePages: MetadataRoute.Sitemap = getAllArticles()
    .filter((a) => a.published)
    .map((a) => ({
      url: url(`/knowledge/${a.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...verticalPages, ...articlePages];
}
