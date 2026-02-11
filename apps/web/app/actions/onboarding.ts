'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { companies } from '@kivvi/database';
import type { CompanySettings } from '@kivvi/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import {
  initializeCompany,
  completeOnboarding,
  updateOnboardingStep,
  getOnboardingState,
  bulkInsertContacts,
  bulkInsertProducts,
  bulkInsertDocuments,
  bulkInsertJournalEntries,
  bulkInsertStockLevels,
  buildContactLookup,
  buildProductLookup,
  buildAccountCodeMap,
  ensureProductGroups,
  ensureManufacturers,
  updateSequencesAfterImport,
} from '@kivvi/core';

// ============================================================================
// SCHEMAS
// ============================================================================

const companyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  legalName: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(2).optional().default('CH'),
  vatNumber: z.string().max(50).optional().nullable(),
});

const businessConfigSchema = z.object({
  defaultVatRate: z.number().min(0).max(100),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).default(30),
  bankIban: z.string().max(34).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
});

// ============================================================================
// STEP 1: COMPANY INFO
// ============================================================================

export async function updateCompanyInfoAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();
    const parsed = companyInfoSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }

    await db
      .update(companies)
      .set({
        name: parsed.data.name,
        legalName: parsed.data.legalName || null,
        address: parsed.data.address || null,
        postalCode: parsed.data.postalCode || null,
        city: parsed.data.city || null,
        country: parsed.data.country,
        vatNumber: parsed.data.vatNumber || null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));

    await updateOnboardingStep(db, companyId, 2);

    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update company info') };
  }
}

// ============================================================================
// STEP 2: BUSINESS CONFIG + INITIALIZATION
// ============================================================================

export async function initializeCompanyAction(
  input: unknown
): Promise<ActionResult<{ accountsCreated: number; sequencesCreated: number }>> {
  try {
    const { companyId } = await getSession();
    const parsed = businessConfigSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' };
    }

    const result = await initializeCompany(db, companyId, {
      defaultVatRate: parsed.data.defaultVatRate,
      defaultPaymentTermsDays: parsed.data.defaultPaymentTermsDays,
      bankAccount: {
        iban: parsed.data.bankIban || undefined,
        bankName: parsed.data.bankName || undefined,
      },
    });

    return {
      success: true,
      data: {
        accountsCreated: result.accountsCreated,
        sequencesCreated: result.sequencesCreated,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to initialize company') };
  }
}

// ============================================================================
// STEP 3: DATA IMPORT
// ============================================================================

export async function executeImportAction(
  entityType: string,
  rows: Array<Record<string, string | null>>
): Promise<ActionResult<{ inserted: number; skipped: number; errors: string[] }>> {
  try {
    const { companyId, userId } = await getSession();

    let result;

    switch (entityType) {
      case 'customer': {
        result = await bulkInsertContacts(db, companyId, rows, 'customer');
        break;
      }
      case 'vendor': {
        result = await bulkInsertContacts(db, companyId, rows, 'vendor');
        break;
      }
      case 'product': {
        // Extract unique product groups and manufacturers from rows
        const groupNames = rows.map((r) => r.productGroup).filter(Boolean) as string[];
        const manufacturerNames = rows.map((r) => r.manufacturer).filter(Boolean) as string[];

        const productGroupMap = await ensureProductGroups(db, companyId, groupNames);
        const manufacturerMap = await ensureManufacturers(db, companyId, manufacturerNames);

        result = await bulkInsertProducts(db, companyId, rows, productGroupMap, manufacturerMap);
        break;
      }
      case 'invoice': {
        const contactLookup = await buildContactLookup(db, companyId);
        result = await bulkInsertDocuments(db, companyId, userId, rows, contactLookup, 'invoice');
        break;
      }
      case 'purchase_invoice': {
        const contactLookup = await buildContactLookup(db, companyId);
        result = await bulkInsertDocuments(db, companyId, userId, rows, contactLookup, 'purchase_invoice');
        break;
      }
      case 'journal_entry': {
        const accountCodeMap = await buildAccountCodeMap(db, companyId);
        result = await bulkInsertJournalEntries(db, companyId, rows, accountCodeMap);
        break;
      }
      case 'stock': {
        // Find default warehouse
        const { warehouses } = await import('@kivvi/database');
        const [warehouse] = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(eq(warehouses.companyId, companyId));

        if (!warehouse) {
          return { success: false, error: 'No warehouse found. Complete step 2 first.' };
        }

        const productLookup = await buildProductLookup(db, companyId);
        result = await bulkInsertStockLevels(db, companyId, warehouse.id, rows, productLookup);
        break;
      }
      default:
        return { success: false, error: `Unknown entity type: ${entityType}` };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Import failed') };
  }
}

// ============================================================================
// COMPLETE ONBOARDING
// ============================================================================

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    await completeOnboarding(db, companyId);

    // Update sequences to avoid collisions with imported data
    await updateSequencesAfterImport(db, companyId);

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to complete onboarding') };
  }
}

// ============================================================================
// GET ONBOARDING STATE (for step routing)
// ============================================================================

export async function getOnboardingStateAction(): Promise<
  ActionResult<{ step: number; completedAt: string | null; companyName: string | null }>
> {
  try {
    const { companyId } = await getSession();
    const state = await getOnboardingState(db, companyId);

    const [company] = await db
      .select({ name: companies.name, settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    return {
      success: true,
      data: {
        ...state,
        companyName: company?.name ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to get onboarding state') };
  }
}

/**
 * Get company details for pre-filling the onboarding form.
 */
export async function getCompanyDetailsAction(): Promise<ActionResult<{
  name: string;
  legalName: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  vatNumber: string | null;
  settings: CompanySettings;
}>> {
  try {
    const { companyId } = await getSession();

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    return {
      success: true,
      data: {
        name: company.name,
        legalName: company.legalName,
        address: company.address,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country ?? 'CH',
        vatNumber: company.vatNumber,
        settings: (company.settings as CompanySettings) || {},
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to get company details') };
  }
}
