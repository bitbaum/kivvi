import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A build must not depend on Google Fonts answering: `next/font/google`
// downloads the faces at build time, and a failed download fails the build.
// The faces are vendored in `apps/web/fonts/` and loaded by `lib/fonts.ts`.
const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FONTS_MODULE = join(WEB, "lib", "fonts.ts");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry.startsWith(".")) return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("fonts are served from the repo", () => {
  it("no source file imports next/font/google", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => sourceFiles(join(WEB, d)))
      .filter((f) => /from\s+["']next\/font\/google["']/.test(readFileSync(f, "utf8")))
      .map((f) => relative(WEB, f));
    expect(offenders).toEqual([]);
  });

  const paths = [
    ...readFileSync(FONTS_MODULE, "utf8").matchAll(/"(\.\.\/fonts\/[^"]+\.woff2)"/g),
  ].map((m) => m[1]);

  it("lib/fonts.ts loads the vendored faces", () => {
    expect(paths.length).toBeGreaterThan(0);
  });

  it.each([...new Set(paths)])("%s is a woff2 file with its licence beside it", (path) => {
    const file = join(dirname(FONTS_MODULE), path);
    // A truncated download or an HTML error page would still build.
    expect(readFileSync(file).subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(existsSync(join(dirname(file), "OFL.txt"))).toBe(true);
  });
});
