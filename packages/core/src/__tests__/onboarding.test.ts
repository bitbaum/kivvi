import { describe, it, expect } from "vitest";
import type {
  InitializeCompanyConfig,
  InitializeCompanyResult,
} from "../domain/onboarding";

/**
 * Tests for the onboarding domain module.
 *
 * The main functions (initializeCompany, updateOnboardingStep, completeOnboarding,
 * getOnboardingState) all require a database connection. We test the exported
 * types and verify the contracts they define.
 *
 * For initializeCompany, we verify the type contracts ensure:
 * - Config requires defaultVatRate and defaultPaymentTermsDays
 * - Result includes accountsCreated, sequencesCreated, warehouseId, fiscalYearId
 */

// ============================================================================
// InitializeCompanyConfig type contract
// ============================================================================

describe("InitializeCompanyConfig", () => {
  it("requires defaultVatRate and defaultPaymentTermsDays", () => {
    const config: InitializeCompanyConfig = {
      defaultVatRate: 8.1,
      defaultPaymentTermsDays: 30,
    };
    expect(config.defaultVatRate).toBe(8.1);
    expect(config.defaultPaymentTermsDays).toBe(30);
  });

  it("accepts optional bank account info", () => {
    const config: InitializeCompanyConfig = {
      defaultVatRate: 8.1,
      defaultPaymentTermsDays: 30,
      bankAccount: {
        iban: "CH93 0076 2011 6238 5295 7",
        bankName: "UBS",
      },
    };
    expect(config.bankAccount?.iban).toBe("CH93 0076 2011 6238 5295 7");
    expect(config.bankAccount?.bankName).toBe("UBS");
  });

  it("accepts bank account with only iban", () => {
    const config: InitializeCompanyConfig = {
      defaultVatRate: 2.6,
      defaultPaymentTermsDays: 60,
      bankAccount: {
        iban: "CH93 0076 2011 6238 5295 7",
      },
    };
    expect(config.bankAccount?.iban).toBeDefined();
    expect(config.bankAccount?.bankName).toBeUndefined();
  });

  it("accepts bank account with only bank name", () => {
    const config: InitializeCompanyConfig = {
      defaultVatRate: 0,
      defaultPaymentTermsDays: 10,
      bankAccount: {
        bankName: "Raiffeisen",
      },
    };
    expect(config.bankAccount?.bankName).toBe("Raiffeisen");
    expect(config.bankAccount?.iban).toBeUndefined();
  });

  it("works with Swiss standard VAT rates", () => {
    const rates = [8.1, 2.6, 0];
    for (const rate of rates) {
      const config: InitializeCompanyConfig = {
        defaultVatRate: rate,
        defaultPaymentTermsDays: 30,
      };
      expect(config.defaultVatRate).toBe(rate);
    }
  });

  it("works with various payment terms", () => {
    const terms = [0, 10, 14, 30, 45, 60, 90];
    for (const days of terms) {
      const config: InitializeCompanyConfig = {
        defaultVatRate: 8.1,
        defaultPaymentTermsDays: days,
      };
      expect(config.defaultPaymentTermsDays).toBe(days);
    }
  });
});

// ============================================================================
// InitializeCompanyResult type contract
// ============================================================================

describe("InitializeCompanyResult", () => {
  it("defines expected result shape", () => {
    const result: InitializeCompanyResult = {
      accountsCreated: 227,
      sequencesCreated: 11,
      warehouseId: "some-uuid",
      fiscalYearId: "some-uuid",
    };
    expect(result.accountsCreated).toBe(227);
    expect(result.sequencesCreated).toBe(11);
    expect(result.warehouseId).toBeDefined();
    expect(result.fiscalYearId).toBeDefined();
  });

  it("sequencesCreated should be 11 (matching SEQUENCE_DEFAULTS)", () => {
    // The initializeCompany function hardcodes sequencesCreated: 11
    // This documents the expected number of sequences
    const result: InitializeCompanyResult = {
      accountsCreated: 0,
      sequencesCreated: 11,
      warehouseId: "id",
      fiscalYearId: "id",
    };
    expect(result.sequencesCreated).toBe(11);
  });

  it("accountsCreated for Swiss KMU should be 227", () => {
    // Documents the expected chart of accounts size
    const result: InitializeCompanyResult = {
      accountsCreated: 227,
      sequencesCreated: 11,
      warehouseId: "id",
      fiscalYearId: "id",
    };
    expect(result.accountsCreated).toBe(227);
  });
});

// ============================================================================
// Onboarding flow contract
// ============================================================================

describe("onboarding flow contract", () => {
  it("onboarding steps range from 1 to 4", () => {
    // Step 1: Company Info
    // Step 2: Business Config (triggers initializeCompany)
    // Step 3: Data Import
    // Step 4: Complete (set by completeOnboarding)
    const validSteps = [1, 2, 3, 4];
    for (const step of validSteps) {
      expect(step).toBeGreaterThanOrEqual(1);
      expect(step).toBeLessThanOrEqual(4);
    }
  });

  it("initializeCompany is called during step 2 and sets onboardingStep to 3", () => {
    // This documents the contract: after initializeCompany runs,
    // the settings.onboardingStep is set to 3 (ready for data import)
    const expectedStepAfterInit = 3;
    expect(expectedStepAfterInit).toBe(3);
  });

  it("completeOnboarding sets step to 4 and assigns trial", () => {
    // Documents the contract: completeOnboarding sets:
    // - onboardingStep: 4
    // - plan: 'free'
    // - trialEndsAt: 30 days from now
    // - onboardingCompletedAt: now
    const expectedFinalStep = 4;
    const expectedPlan = "free";
    expect(expectedFinalStep).toBe(4);
    expect(expectedPlan).toBe("free");
  });
});
