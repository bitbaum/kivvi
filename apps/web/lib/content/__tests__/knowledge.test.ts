import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { getAllArticles, getArticle } from "../knowledge";

/**
 * The knowledge base moved from `marked` → HTML string →
 * `dangerouslySetInnerHTML` to bip-kit's typed blocks. Two properties of that
 * swap are worth holding down, because breaking either is silent:
 *
 * 1. ANCHOR IDS. The old ids came from a German slugifier local to this file.
 *    bip-kit's is umlaut-aware and produced identical ids for every heading in
 *    the repo at migration time. If a future bip-kit release changes its
 *    slugifier, every published `#anchor` link and search result silently
 *    points at nothing — no 404, no error, just a page that ignores the hash.
 *    This test re-derives the old ids and demands they still match.
 *
 * 2. NO RAW HTML. Typed blocks are the security model: the renderer emits
 *    React elements from a discriminated union, so there is no HTML string in
 *    the path at all. `getArticle` returning blocks rather than `html` is what
 *    makes that true, and this pins it.
 */

const CONTENT_DIR = join(process.cwd(), "content/knowledge");

/** The pre-migration slugifier, kept verbatim as the reference to match. */
function legacySlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüÄÖÜ]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "ae", Ö: "oe", Ü: "ue" })[c] ?? c)
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** `## Heading` lines of one article, in document order. */
function headingTexts(slug: string): string[] {
  const raw = readFileSync(join(CONTENT_DIR, `${slug}.md`), "utf8");
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  return body
    .split("\n")
    .map((line) => /^##\s+(.*)$/.exec(line)?.[1]?.trim())
    .filter((text): text is string => Boolean(text));
}

const slugs = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(".md", ""));

describe("knowledge base content", () => {
  it("has articles to render", () => {
    expect(slugs.length).toBeGreaterThan(0);
    expect(getAllArticles().length).toBe(slugs.length);
  });

  it.each(slugs)("%s keeps every heading anchor the old slugifier produced", async (slug) => {
    const article = await getArticle(slug);
    expect(article).not.toBeNull();

    const expected = headingTexts(slug).map(legacySlug);
    const actual = article!.sections.filter((s) => s.level === 2).map((s) => s.id);

    expect(actual).toEqual(expected);
  });

  it.each(slugs)("%s parses into typed blocks, never an HTML string", async (slug) => {
    const article = await getArticle(slug);

    expect(article).not.toBeNull();
    expect(Array.isArray(article!.blocks)).toBe(true);
    expect(article!.blocks.length).toBeGreaterThan(0);
    // Every block is a tagged member of the union — nothing carries markup.
    for (const block of article!.blocks) expect(typeof block.type).toBe("string");
    expect(article).not.toHaveProperty("html");
  });

  it("builds each TOC entry from the heading block's own id", async () => {
    // The page used to re-derive ids with a second copy of the slugifier. The
    // ids and the TOC now come from one parse, so they cannot disagree.
    const article = await getArticle(slugs[0]);
    const headingIds = article!.blocks
      .filter((b): b is Extract<typeof b, { type: "h2" }> => b.type === "h2")
      .map((b) => b.id);

    expect(article!.sections.filter((s) => s.level === 2).map((s) => s.id)).toEqual(headingIds);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getArticle("does-not-exist")).toBeNull();
  });
});
