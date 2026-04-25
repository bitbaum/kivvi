/**
 * Schema.org JSON-LD generators for the FAQ page.
 *
 * Both blocks are derived from the translated content rather than holding
 * a second copy of the strings — keeps SSOT and prevents drift between
 * the visible FAQ and the SEO schema.
 */

export interface FaqQuestion {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  questions: FaqQuestion[];
}

export function buildOrganizationLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "revamp-it",
    url: "https://revamp-it.ch",
    foundingDate: "2003",
    description,
  };
}

/**
 * Schema.org FAQPage entries. Picks the first 6 visible Q/A pairs across
 * groups — enough for rich-result eligibility without dumping every entry.
 */
export function buildFaqPageLd(groups: FaqGroup[]) {
  const flat = groups.flatMap((g) => g.questions);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: flat.slice(0, 6).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
