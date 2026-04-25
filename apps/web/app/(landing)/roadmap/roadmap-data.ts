import {
  Check,
  Hammer,
  Calendar,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

/**
 * Structural metadata for the roadmap page. Translated content
 * (competitor verdicts, feature labels, pipeline items, status labels,
 * stage headings) lives in messages/{locale}.json under landing.roadmap.*
 * — this file only holds enums, the support matrix values, and icon
 * configuration.
 */

export type Support = "yes" | "partial" | "no";
export type PipelineStatus = "live" | "building" | "planned" | "vision";

export type CompetitorKey =
  | "bexio"
  | "odoo"
  | "abacus"
  | "kivitendo"
  | "repairshopr"
  | "kivvi";

export const COMPETITOR_KEYS: readonly CompetitorKey[] = [
  "bexio",
  "odoo",
  "abacus",
  "kivitendo",
  "repairshopr",
  "kivvi",
];

/**
 * Support matrix per feature × competitor. Index-aligned with
 * landing.roadmap.features in messages.
 */
export const FEATURE_SUPPORT: ReadonlyArray<Record<CompetitorKey, Support>> = [
  {
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "partial",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "yes",
    kivvi: "partial",
  },
  {
    bexio: "yes",
    odoo: "partial",
    abacus: "yes",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "yes",
    odoo: "yes",
    abacus: "yes",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "no",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "partial",
    abacus: "no",
    kivitendo: "no",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "yes",
    abacus: "no",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
  {
    bexio: "no",
    odoo: "yes",
    abacus: "no",
    kivitendo: "yes",
    repairshopr: "no",
    kivvi: "yes",
  },
];

export interface StatusVisualConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

export const STATUS_CONFIG: Record<PipelineStatus, StatusVisualConfig> = {
  live: {
    icon: Check,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  building: {
    icon: Hammer,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/20",
  },
  planned: {
    icon: Calendar,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  vision: {
    icon: Lightbulb,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border",
  },
};

export const STAGES: readonly PipelineStatus[] = [
  "live",
  "building",
  "planned",
  "vision",
];
