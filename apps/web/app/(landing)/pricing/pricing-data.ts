import { Server, Cloud, Building2, type LucideIcon } from "lucide-react";

export const TIER_IDS = ["opensource", "cloud", "enterprise"] as const;
export type TierId = (typeof TIER_IDS)[number];

export interface TierMeta {
  icon: LucideIcon;
  highlight: boolean;
  hasBadge: boolean;
  hasPriceSub: boolean;
  cta: { href: string; external: boolean; primary: boolean };
}

export const TIER_META: Record<TierId, TierMeta> = {
  opensource: {
    icon: Server,
    highlight: false,
    hasBadge: false,
    hasPriceSub: true,
    cta: {
      href: "https://github.com/g-but/kivvi",
      external: true,
      primary: false,
    },
  },
  cloud: {
    icon: Cloud,
    highlight: true,
    hasBadge: true,
    hasPriceSub: true,
    cta: { href: "/register", external: false, primary: true },
  },
  enterprise: {
    icon: Building2,
    highlight: false,
    hasBadge: false,
    hasPriceSub: false,
    cta: { href: "/contact", external: false, primary: false },
  },
};

export type FeatureValue = "yes" | "no" | string;

export interface ComparisonRow {
  id: string;
  opensource: FeatureValue;
  cloud: FeatureValue;
  enterprise: FeatureValue;
}

/** Each row references a feature label and value-keys under landing.pricing.comparison.* */
export const COMPARISON_ROWS: readonly ComparisonRow[] = [
  { id: "allFeatures", opensource: "yes", cloud: "yes", enterprise: "yes" },
  { id: "unlimitedUsers", opensource: "yes", cloud: "yes", enterprise: "yes" },
  { id: "qrInvoices", opensource: "yes", cloud: "yes", enterprise: "yes" },
  {
    id: "backups",
    opensource: "selfManaged",
    cloud: "included",
    enterprise: "included",
  },
  {
    id: "updates",
    opensource: "manual",
    cloud: "automatic",
    enterprise: "automatic",
  },
  {
    id: "emailSupport",
    opensource: "community",
    cloud: "h48",
    enterprise: "priority",
  },
  { id: "sla", opensource: "no", cloud: "no", enterprise: "yes" },
  {
    id: "dataInSwitzerland",
    opensource: "byChoice",
    cloud: "yes",
    enterprise: "yes",
  },
];
