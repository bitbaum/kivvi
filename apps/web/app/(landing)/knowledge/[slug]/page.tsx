import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ReadingProgress } from "bip-kit/react";
import "bip-kit/styles.css";
// Loaded after bip-kit's own stylesheet on purpose — the Kivvi token mapping
// wins on source order as well as specificity. @see lib/content/knowledge.css
import "@/lib/content/knowledge.css";
import { getArticle, getAllArticles } from "@/lib/content/knowledge";
import { ArticleContent } from "@/lib/content/ArticleContent";
import { Button } from "@/components/ui/button";
import { buildPageMeta } from "@/lib/config/site";

// ============================================================
// Page
// Articles are Markdown files in apps/web/content/knowledge/[slug].md.
// To add an article: create a new .md file with frontmatter + content.
// No code changes required.
// ============================================================

export async function generateStaticParams() {
  return getAllArticles()
    .filter((a) => a.published)
    .map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  const t = await getTranslations("landing.knowledge.metadata");
  const locale = await getLocale();
  const title = `${article.meta.title} — ${t("knowledgeBaseSuffix")}`;
  const description = article.meta.lead;
  return {
    title,
    description,
    ...buildPageMeta(title, description, locale),
  };
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const t = await getTranslations("landing.knowledge.article");
  const { meta, blocks, sections } = article;
  const allArticles = getAllArticles();
  const currentIndex = allArticles.findIndex((a) => a.slug === slug);
  const nextMeta = currentIndex >= 0 ? allArticles[currentIndex + 1] : undefined;

  return (
    <>
      {/* A viewport-fixed hairline showing how far into the article the reader
          is — the one piece of chrome a long read earns. */}
      <ReadingProgress />
      <div className="mx-auto max-w-3xl py-8">
        {/* Back link */}
        <Link
          href="/knowledge"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backLink")}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {meta.tag}
            </span>
            <span className="text-xs text-muted-foreground">
              {meta.readTime} {t("readTimeSuffix")}
            </span>
          </div>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{meta.title}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{meta.lead}</p>
        </div>

        {/* Table of contents (auto-generated from ## headings) */}
        {sections.length > 0 && (
          <nav className="mb-10 rounded-xl border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("tocHeader")}
            </p>
            {/* Each entry's `id` is the heading block's own id, so a TOC link
                and the heading it points at cannot drift apart. This used to
                re-derive the id from the heading text with a second copy of
                the slugifier — two sources of truth for one anchor. */}
            <ol className="space-y-1.5">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-baseline gap-2.5 text-sm hover:text-primary transition-colors"
                  >
                    <span className="shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                    <span>{section.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Content — typed blocks rendered as React elements. There is no HTML
            string in this path any more, so nothing to set dangerously. */}
        <ArticleContent blocks={blocks} />

        {/* Next article */}
        {nextMeta && (
          <div className="mt-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("nextArticleLabel")}
            </p>
            <Link
              href={`/knowledge/${nextMeta.slug}`}
              className="group flex items-center justify-between rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {nextMeta.tag}
                </span>
                <h3 className="mt-2 font-semibold group-hover:text-primary transition-colors">
                  {nextMeta.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{nextMeta.lead}</p>
              </div>
              <ArrowRight className="ml-4 h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-6 rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold">{t("footerCtaTitle")}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t("footerCtaDescription")}</p>
          <Button asChild variant="link" className="px-0">
            <Link href="/knowledge">{t("footerCtaButton")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

// ============================================================
