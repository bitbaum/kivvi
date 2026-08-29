/**
 * Knowledge base content system.
 *
 * Articles are Markdown files in apps/web/content/knowledge/[slug].md.
 * Each file has YAML frontmatter (title, tag, readTime, etc.) and Markdown content.
 *
 * SSOT: the .md file. Metadata lives in frontmatter, content lives in the file body.
 * To add an article: create a new .md file. That's it.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { marked, Renderer } from "marked";

const CONTENT_DIR = join(process.cwd(), "content/knowledge");

export type KnowledgeArticleMeta = {
  slug: string;
  title: string;
  tag: string;
  readTime: string;
  excerpt: string;
  lead: string;
  published: boolean;
  order?: number;
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüÄÖÜ]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue" })[c] ?? c)
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Returns all published articles sorted by `order` frontmatter field.
 * Unpublished articles are included (for listing page "coming soon" cards).
 */
export function getAllArticles(): KnowledgeArticleMeta[] {
  try {
    const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
    const articles = files.map((file) => {
      const slug = file.replace(".md", "");
      const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
      const { data } = matter(raw);
      return { ...(data as Omit<KnowledgeArticleMeta, "slug">), slug };
    });
    return articles.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  } catch {
    return [];
  }
}

/**
 * Returns rendered HTML and metadata for a single article.
 * Headings get id attributes for the table-of-contents anchor links.
 * H2 headings are collected and returned as `sections` for the TOC.
 */
export async function getArticle(slug: string): Promise<{
  meta: KnowledgeArticleMeta;
  html: string;
  sections: string[];
} | null> {
  try {
    const raw = readFileSync(join(CONTENT_DIR, `${slug}.md`), "utf8");
    const { data, content } = matter(raw);

    const sections: string[] = [];
    const renderer = new Renderer();

    renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
      const id = slugifyHeading(text);
      if (depth === 2) sections.push(text);
      return `<h${depth} id="${id}" class="scroll-mt-20">${text}</h${depth}>\n`;
    };

    marked.use({ renderer });
    const html = await marked.parse(content);

    return {
      meta: { ...(data as Omit<KnowledgeArticleMeta, "slug">), slug },
      html,
      sections,
    };
  } catch {
    return null;
  }
}
