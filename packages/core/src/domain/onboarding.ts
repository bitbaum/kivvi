import { eq, sql } from "drizzle-orm";
import { companies } from "@kivvi/database";
import type { Database, CompanySettings } from "@kivvi/database";
import { seedChartOfAccounts, createFiscalYear } from "./accounting";
import { initializeSequences } from "./number-sequences";
import { createWarehouse } from "./inventory";
import { seedCostCenters } from "./cost-centers";
import { seedDefaultPostingGroups } from "./posting-groups";
import { getDefaultTrialEnd } from "./billing";

// ============================================================================
// TYPES
// ============================================================================

export interface InitializeCompanyConfig {
  defaultVatRate: number;
  defaultPaymentTermsDays: number;
  bankAccount?: {
    iban?: string;
    bankName?: string;
  };
}

export interface InitializeCompanyResult {
  accountsCreated: number;
  sequencesCreated: number;
  warehouseId: string;
  fiscalYearId: string;
}

// ============================================================================
// INITIALIZE COMPANY
// ============================================================================

/**
 * One-call company initialization: seeds accounts, sequences, warehouse, fiscal year.
 * Called during onboarding step 2.
 */
export async function initializeCompany(
  db: Database,
  companyId: string,
  config: InitializeCompanyConfig,
): Promise<InitializeCompanyResult> {
  return await db.transaction(async (tx) => {
    // 1. Seed chart of accounts (Swiss KMU Kontenrahmen)
    const accountsCreated = await seedChartOfAccounts(tx, companyId);

    // 2. Initialize number sequences (12 types)
    await initializeSequences(tx, companyId);

    // 3. Create default warehouse
    const warehouse = await createWarehouse(tx, companyId, {
      name: "Hauptlager",
      isDefault: true,
    });

    // 4. Create current fiscal year
    const currentYear = new Date().getFullYear();
    const fiscalYear = await createFiscalYear(tx, companyId, {
      name: `Geschäftsjahr ${currentYear}`,
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
    });

    // 4b. Seed default operating activities (analytical dimension)
    await seedCostCenters(tx, companyId);

    // 4c. Seed default posting groups (revenue routing: Warenertrag→3000,
    // Dienstleistungen→3200); richer streams are added per company later.
    await seedDefaultPostingGroups(tx, companyId);

    // 5. Update company settings
    const [company] = await tx
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const existingSettings = (company?.settings as CompanySettings) || {};
    const updatedSettings: CompanySettings = {
      ...existingSettings,
      defaultVatRate: config.defaultVatRate,
      defaultPaymentTermsDays: config.defaultPaymentTermsDays,
      onboardingStep: 3,
    };

    if (config.bankAccount) {
      updatedSettings.bankAccount = config.bankAccount;
    }

    await tx
      .update(companies)
      .set({
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    return {
      accountsCreated,
      sequencesCreated: 12,
      warehouseId: warehouse.id,
      fiscalYearId: fiscalYear.id,
    };
  });
}

// ============================================================================
// ONBOARDING PROGRESS
// ============================================================================

/**
 * Update the current onboarding step for resume support.
 */
export async function updateOnboardingStep(
  db: Database,
  companyId: string,
  step: number,
): Promise<void> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  const existingSettings = (company?.settings as CompanySettings) || {};

  await db
    .update(companies)
    .set({
      settings: { ...existingSettings, onboardingStep: step },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

/**
 * Mark onboarding as complete. Sets onboardingCompletedAt to now.
 */
export async function completeOnboarding(db: Database, companyId: string): Promise<void> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  const existingSettings = (company?.settings as CompanySettings) || {};

  await db
    .update(companies)
    .set({
      settings: {
        ...existingSettings,
        onboardingCompletedAt: new Date().toISOString(),
        onboardingStep: 4,
        plan: "free" as const,
        trialEndsAt: getDefaultTrialEnd(),
      },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

/**
 * Get the current onboarding state for a company.
 */
export async function getOnboardingState(
  db: Database,
  companyId: string,
): Promise<{ step: number; completedAt: string | null }> {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  const settings = (company?.settings as CompanySettings) || {};
  return {
    step: settings.onboardingStep ?? 1,
    completedAt: settings.onboardingCompletedAt ?? null,
  };
}
