#!/usr/bin/env tsx
/**
 * Set Organization Profile for a Company
 *
 * Writes the org profile into company settings so the AI system
 * has full organizational context for autopilot operation.
 *
 * Usage:
 *   COMPANY_ID=<uuid> npx tsx scripts/set-org-profile.ts
 *
 * Requires DATABASE_URL env var (reads from .env.local if present).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import { createPostgresClient, companies } from "@kivvi/database";
import type { CompanySettings, OrgProfile } from "@kivvi/database";

// ============================================================================
// ENV
// ============================================================================

function loadEnv(): void {
  if (process.env.DATABASE_URL) return;

  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) {
    console.error("DATABASE_URL not set and no .env.local found");
    process.exit(1);
  }

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ============================================================================
// REVAMP-IT ORG PROFILE
// ============================================================================

const REVAMPIT_PROFILE: OrgProfile = {
  identity: {
    mission:
      "Reduce e-waste and bridge the digital divide by refurbishing donated IT equipment and providing it to people who need it.",
    legalForm: "Non-profit association (Verein)",
    founded: "2012",
    location: "Winterthur, Switzerland",
    website: "https://revampit.ch",
    description:
      "Revamp-IT is a social enterprise that collects donated computers and electronics, professionally refurbishes them with Linux, and sells them at affordable prices. We provide IT training, repair services, and digital inclusion programs. We operate as a non-profit with a team of volunteers and staff funded through sales, donations, and grants.",
  },
  services: [
    {
      name: "Refurbished Computers",
      description:
        "Professionally refurbished laptops and desktops with Linux pre-installed, tested and quality-checked",
      pricing: "CHF 50-250 depending on specs",
    },
    {
      name: "IT Repair & Support",
      description:
        "Computer repair, data recovery, virus removal, hardware upgrades for individuals and small businesses",
      pricing: "CHF 60/hour",
    },
    {
      name: "IT Training & Workshops",
      description:
        "Linux workshops, digital literacy courses, basic computer skills for seniors and newcomers",
      pricing: "Free or low-cost (grant-funded)",
    },
    {
      name: "Corporate IT Recycling",
      description:
        "Secure data destruction and professional IT asset disposal for companies, with certificates of destruction",
      pricing: "Free pickup for donations, commercial rates for certified destruction",
    },
    {
      name: "Custom IT Solutions",
      description:
        "Server setup, network configuration, and IT consulting for small businesses and non-profits",
      pricing: "Project-based quotes",
    },
  ],
  team: [
    {
      name: "Gabriel Bircher",
      role: "President / Co-founder",
      responsibilities: "Strategy, partnerships, fundraising, software development",
    },
    {
      name: "Volunteers",
      role: "Refurbishment team",
      responsibilities:
        "Hardware testing, software installation, quality control, customer support",
    },
  ],
  financialContext: {
    fundingSources: [
      "Product sales",
      "Repair services",
      "Donations",
      "Grants",
      "Corporate sponsorships",
    ],
    revenueModel:
      "Hybrid: earned income from sales/services + philanthropic funding from grants/donations. Self-sustaining target is 70% earned income.",
    fiscalYearEnd: "31.12",
    notes:
      "0% VAT (non-profit exemption). All revenue reinvested into the mission. Funded positions through employment programs (RAV/IV/Sozialhilfe).",
  },
  impactMetrics: [
    { label: "Computers refurbished (lifetime)", value: "5000+" },
    { label: "E-waste diverted (tonnes)", value: "50+" },
    { label: "People trained", value: "500+" },
    { label: "Active volunteers", value: "10-15" },
    { label: "Corporate donors", value: "20+" },
  ],
  strategy: {
    vision:
      "By 2030, Revamp-IT is the leading Swiss social enterprise for circular IT, operating in multiple cities with a sustainable business model that scales digital inclusion nationwide.",
    goals: [
      "Expand to a second location (Zurich or Bern)",
      "Achieve 70% earned income ratio for financial sustainability",
      "Launch online shop for refurbished devices",
      "Build partnerships with 50+ corporate IT donors",
      "Create 5 funded employment positions for long-term unemployed",
      "Process 2000+ devices per year",
    ],
    timeline: "Revamp 2030 — 5-year strategic plan",
  },
  fundraising: {
    status: "Active — seeking operational grants and corporate partnerships",
    goal: "CHF 150,000 annual operational funding to sustain 3 full-time positions",
    campaigns: [
      "Corporate IT donation partnerships",
      "Foundation grants for digital inclusion",
      "Crowdfunding for workshop equipment",
    ],
    notes:
      "Impact hub at revamp-info.orangecat.ch provides donors and partners with live impact data, financials, and project updates.",
  },
  communicationStyle: {
    tone: "Friendly, approachable, mission-driven. We speak practically about technology and passionately about social impact. Avoid corporate jargon.",
    language: "German (primary), English (secondary). Swiss German in casual communication.",
    guidelines:
      "Always emphasize the dual impact: environmental (e-waste reduction) AND social (digital inclusion). Use concrete numbers when possible. Our audience ranges from corporate IT managers to individual customers to grant-making foundations.",
  },
  customerSegments: [
    {
      segment: "Individual buyers",
      description:
        "Budget-conscious individuals, students, seniors, and newcomers looking for affordable, reliable computers",
    },
    {
      segment: "Corporate IT donors",
      description:
        "Companies replacing IT equipment who want responsible recycling with social impact and data destruction certificates",
    },
    {
      segment: "Small businesses & non-profits",
      description:
        "Organizations needing affordable IT solutions, repair services, or bulk refurbished equipment",
    },
    {
      segment: "Social service referrals",
      description:
        "People referred by social services (Sozialhilfe, IV, refugee services) who need free or subsidized computers",
    },
    {
      segment: "Schools & educational institutions",
      description: "Schools needing affordable classroom computers or digital literacy programs",
    },
  ],
};

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  loadEnv();

  const companyId = process.env.COMPANY_ID;
  if (!companyId) {
    console.error("COMPANY_ID env var is required");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = createPostgresClient(process.env.DATABASE_URL);

  // Fetch current settings
  const company = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (company.length === 0) {
    console.error(`Company not found: ${companyId}`);
    process.exit(1);
  }

  const currentSettings = (company[0].settings as CompanySettings) || {};

  // Merge org profile and vertical into settings
  const updatedSettings: CompanySettings = {
    ...currentSettings,
    vertical: "nonprofit",
    orgProfile: REVAMPIT_PROFILE,
  };

  await db.update(companies).set({ settings: updatedSettings }).where(eq(companies.id, companyId));

  console.log(`Updated org profile for company ${companyId}`);
  console.log(`  Vertical: nonprofit`);
  console.log(
    `  Profile sections: ${Object.keys(REVAMPIT_PROFILE).filter((k) => REVAMPIT_PROFILE[k as keyof OrgProfile]).length}`,
  );
  console.log("Done.");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
