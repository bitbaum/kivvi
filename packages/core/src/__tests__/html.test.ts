import { describe, it, expect } from "vitest";
import { escapeHtml } from "../utils/html";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes less-than signs", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than signs", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's done")).toBe("it&#x27;s done");
  });

  it("neutralises a script injection attempt", () => {
    const malicious = '<script>alert("xss")</script>';
    const result = escapeHtml(malicious);
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("neutralises an img onerror injection attempt", () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const result = escapeHtml(malicious);
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("passes through a safe string unchanged", () => {
    const safe = "Muster AG — Zürich";
    expect(escapeHtml(safe)).toBe(safe);
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes all five characters in a single string", () => {
    expect(escapeHtml(`<"'>&`)).toBe("&lt;&quot;&#x27;&gt;&amp;");
  });
});
