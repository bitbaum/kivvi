import { eq } from "drizzle-orm";
import { companies, type CompanySettings } from "@kivvi/database";
import type { Database } from "@kivvi/database";

// Derived from CompanySettings.dashboardPreferences — SSOT is the schema
export type DashboardPreferences = NonNullable<CompanySettings["dashboardPreferences"]>;

/**
 * Get dashboard preferences for a company
 */
export async function getDashboardPreferences(
  db: Database,
  companyId: string,
): Promise<DashboardPreferences> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company?.settings) {
    return {}; // Return empty preferences if none set
  }

  const settings = company.settings as CompanySettings;
  return settings.dashboardPreferences || {};
}

/**
 * Update dashboard preferences for a company
 * Merges with existing settings
 */
export async function updateDashboardPreferences(
  db: Database,
  companyId: string,
  preferences: Partial<DashboardPreferences>,
): Promise<void> {
  // Get current settings
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const currentSettings = (company?.settings as CompanySettings) || {};
  const currentPreferences = currentSettings.dashboardPreferences || {};

  // Merge preferences
  const updatedSettings: CompanySettings = {
    ...currentSettings,
    dashboardPreferences: {
      ...currentPreferences,
      ...preferences,
    },
  };

  // Update company settings
  await db.update(companies).set({ settings: updatedSettings }).where(eq(companies.id, companyId));
}

/**
 * Reset dashboard preferences to defaults
 */
export async function resetDashboardPreferences(db: Database, companyId: string): Promise<void> {
  // Get current settings
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const currentSettings = (company?.settings as CompanySettings) || {};

  // Remove dashboard preferences
  const updatedSettings: CompanySettings = {
    ...currentSettings,
    dashboardPreferences: undefined,
  };

  // Update company settings
  await db.update(companies).set({ settings: updatedSettings }).where(eq(companies.id, companyId));
}
