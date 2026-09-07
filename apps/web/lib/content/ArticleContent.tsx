import { ArticleBody, setHighlighterLoader } from "bip-kit/react";
import { MermaidBlock } from "bip-kit/react/mermaid";
import type { ContentBlock } from "bip-kit";

/**
 * The knowledge-base body renderer — bip-kit's reference renderer with Kivvi's
 * wiring.
 *
 * WHY THE LOADER IS REGISTERED HERE. shiki is an *optional* peer, so bip-kit's
 * zero-config load goes through an import that bundlers and Next's output file
 * tracing cannot see. Under `output: "standalone"` that silently ships a build
 * with no highlighter and no error — code blocks just lose their colour. The
 * literal `() => import("shiki")` has to live in OUR module graph, where the
 * bundler and the tracer can both follow it. FleetCrown shipped that exact
 * hole twice before this seam existed. Do not "clean up" this call.
 *
 * `mermaid` is the one heavyweight optional peer and lives on its own subpath,
 * so it is opt-in: wiring it means a ```mermaid fence renders as a themed
 * diagram rather than its own source. MermaidBlock reads the --bp-* tokens and
 * follows the `light`/`dark` class next-themes sets, which is how Kivvi
 * switches themes.
 *
 * Lightbox is deliberately NOT imported — ArticleBody ships it by default.
 */
setHighlighterLoader(() => import("shiki"));

export function ArticleContent({ blocks }: { blocks: ContentBlock[] }) {
  return <ArticleBody blocks={blocks} components={{ mermaid: MermaidBlock }} />;
}
