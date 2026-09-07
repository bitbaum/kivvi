/**
 * Knowledge base content system.
 *
 * Articles are Markdown files in apps/web/content/knowledge/[slug].md.
 * Each file has YAML frontmatter (title, tag, readTime, etc.) and Markdown content.
 *
 * SSOT: the .md file. Metadata lives in frontmatter, content lives in the file body.
 * To add an article: create a new .md file. That's it.
 *
 * WHY TYPED BLOCKS, NOT HTML. This module used to run `marked` with a custom
 * Renderer and hand the resulting HTML string to `dangerouslySetInnerHTML`.
 * bip-kit parses the same markdown into a discriminated union of typed blocks
 * that the renderer turns into React elements — which removes that raw-HTML
 * surface by construction: there is no HTML passthrough left for content to
 * hide in, and link hrefs are scheme-guarded at render.
 *
 * WHY THE HEADING IDS DID NOT MOVE. The old anchors came from a local German
 * slugifier (umlauts → ae/oe/ue, ß → ss). bip-kit's `slugify` is umlaut-aware
 * and produces the identical id for all 111 headings across the 19 committed
 * articles — verified before the swap, and pinned by a test — so every existing
 * `#anchor` link keeps working. If that ever stops being true the fix is a shim
 * here, not a silent id change: a moved anchor breaks inbound links and search
 * results with no error anywhere.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { extractToc, parseContentBlocks } from "bip-kit";
import type { ContentBlock, TocEntry } from "bip-kit";

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
 * Returns typed content blocks and metadata for a single article.
 *
 * `sections` is the table of contents built from the heading blocks' own ids,
 * so a TOC link and the heading it points at cannot drift — they are the same
 * value. (The page used to re-derive the ids with a second copy of the
 * slugifier, which is precisely the drift this removes.)
 *
 * `gray-matter` still owns the frontmatter: these files use real YAML — quoted
 * titles containing colons, a boolean `published`, a numeric `order` — and a
 * `key: value` scanner would turn `published: false` into a truthy string.
 */
export async function getArticle(slug: string): Promise<{
  meta: KnowledgeArticleMeta;
  blocks: ContentBlock[];
  sections: TocEntry[];
} | null> {
  try {
    const raw = readFileSync(join(CONTENT_DIR, `${slug}.md`), "utf8");
    const { data, content } = matter(raw);
    const blocks = parseContentBlocks(content);

    return {
      meta: { ...(data as Omit<KnowledgeArticleMeta, "slug">), slug },
      blocks,
      sections: extractToc(blocks),
    };
  } catch {
    return null;
  }
}
