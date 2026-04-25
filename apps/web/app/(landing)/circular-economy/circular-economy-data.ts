/**
 * Structural metadata for the circular-economy page. Translated content
 * (name, description, examples, etc.) lives in messages/{locale}.json
 * under landing.circularEconomy.* — this file only holds ids and links.
 */

export interface ParticipantMeta {
  id: string;
  href: string | null;
}

/** Index-aligned with landing.circularEconomy.participants in messages. */
export const PARTICIPANT_HREFS: readonly ParticipantMeta[] = [
  { id: "it-refurbishers", href: "/for/it-refurbishers" },
  { id: "brockenhaeuser", href: "/for/brockenhaeuser" },
  { id: "repair-cafes", href: "/for/repair-cafes" },
  { id: "vintage", href: "/for/vintage" },
  { id: "bike", href: null },
  { id: "upcycling", href: null },
  { id: "social", href: null },
  { id: "takeback", href: null },
];
