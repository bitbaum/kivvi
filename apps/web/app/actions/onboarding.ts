"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { companies, documents, documentItems } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq, and } from "drizzle-orm";
import Decimal from "decimal.js";
import { z } from "zod";
import { type ActionResult, getSession, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
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
} from "@kivvi/core";
import {
  seedSampleData,
  clearSampleData,
} from "@kivvi/core/src/domain/sample-data";
import { DEFAULT_VAT_RATE } from "@kivvi/core/src/config/vat-rates";

// ============================================================================
// SCHEMAS
// ============================================================================

const businessConfigSchema = z.object({
  defaultVatRate: z.coerce.number().min(0).max(100),
  defaultPaymentTermsDays: z.number().int().min(0).max(365).default(30),
  bankIban: z.string().max(34).optional().nullable(),
  bankName: z.string().max(200).optional().nullable(),
});

// ============================================================================
// STEP 1: COMPANY INFO
// ============================================================================

export async function updateCompanyInfoAction(
  input: unknown,
): Promise<ActionResult> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();
    const companyInfoSchema = z.object({
      name: z.string().min(1, t("companyNameRequired")).max(200),
      legalName: z.string().max(200).optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      postalCode: z.string().max(20).optional().nullable(),
      city: z.string().max(100).optional().nullable(),
      country: z.string().max(2).optional().default("CH"),
      vatNumber: z.string().max(50).optional().nullable(),
    });
    const parsed = companyInfoSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid input",
      };
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
    return {
      success: false,
      error: safeErrorMessage(error, t("errorUpdateCompanyInfo")),
    };
  }
}

// ============================================================================
// STEP 2: BUSINESS CONFIG + INITIALIZATION
// ============================================================================

export async function initializeCompanyAction(
  input: unknown,
): Promise<
  ActionResult<{ accountsCreated: number; sequencesCreated: number }>
> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();
    const parsed = businessConfigSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || "Invalid input",
      };
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
    return {
      success: false,
      error: safeErrorMessage(error, t("errorInitializeCompany")),
    };
  }
}

// ============================================================================
// STEP 3: DATA IMPORT
// ============================================================================

export async function executeImportAction(
  entityType: string,
  rows: Array<Record<string, string | null>>,
  structuredItems?: Record<
    string,
    Array<{
      position: number;
      articleNumber: string;
      description: string;
      quantity: string;
      unit: string;
    }>
  >,
): Promise<
  ActionResult<{ inserted: number; skipped: number; errors: string[] }>
> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId, userId } = await getSession();

    let result;

    switch (entityType) {
      case "customer": {
        result = await bulkInsertContacts(db, companyId, rows, "customer");
        break;
      }
      case "vendor": {
        result = await bulkInsertContacts(db, companyId, rows, "vendor");
        break;
      }
      case "product": {
        // Extract unique product groups and manufacturers from rows
        const groupNames = rows
          .map((r) => r.productGroup)
          .filter(Boolean) as string[];
        const manufacturerNames = rows
          .map((r) => r.manufacturer)
          .filter(Boolean) as string[];

        const productGroupMap = await ensureProductGroups(
          db,
          companyId,
          groupNames,
        );
        const manufacturerMap = await ensureManufacturers(
          db,
          companyId,
          manufacturerNames,
        );

        result = await bulkInsertProducts(
          db,
          companyId,
          rows,
          productGroupMap,
          manufacturerMap,
        );
        break;
      }
      case "invoice": {
        const contactLookup = await buildContactLookup(db, companyId);
        const structuredItemsMap = structuredItems
          ? new Map(Object.entries(structuredItems))
          : undefined;
        const invoiceProductLookup = structuredItemsMap
          ? await buildProductLookup(db, companyId)
          : undefined;
        result = await bulkInsertDocuments(
          db,
          companyId,
          userId,
          rows,
          contactLookup,
          "invoice",
          structuredItemsMap,
          invoiceProductLookup,
        );
        break;
      }
      case "purchase_invoice": {
        const contactLookup = await buildContactLookup(db, companyId);
        const piStructuredItemsMap = structuredItems
          ? new Map(Object.entries(structuredItems))
          : undefined;
        const piProductLookup = piStructuredItemsMap
          ? await buildProductLookup(db, companyId)
          : undefined;
        result = await bulkInsertDocuments(
          db,
          companyId,
          userId,
          rows,
          contactLookup,
          "purchase_invoice",
          piStructuredItemsMap,
          piProductLookup,
        );
        break;
      }
      case "order":
      case "quote":
      case "delivery_note": {
        const docContactLookup = await buildContactLookup(db, companyId);
        const docStructuredItems = structuredItems
          ? new Map(Object.entries(structuredItems))
          : undefined;
        const docProductLookup = docStructuredItems
          ? await buildProductLookup(db, companyId)
          : undefined;
        result = await bulkInsertDocuments(
          db,
          companyId,
          userId,
          rows,
          docContactLookup,
          entityType as "order" | "quote" | "delivery_note",
          docStructuredItems,
          docProductLookup,
        );
        break;
      }
      case "journal_entry": {
        const accountCodeMap = await buildAccountCodeMap(db, companyId);
        result = await bulkInsertJournalEntries(
          db,
          companyId,
          rows,
          accountCodeMap,
        );
        break;
      }
      case "stock": {
        // Find default warehouse
        const { warehouses } = await import("@kivvi/database");
        const [warehouse] = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(eq(warehouses.companyId, companyId));

        if (!warehouse) {
          return {
            success: false,
            error: "No warehouse found. Complete step 2 first.",
          };
        }

        const productLookup = await buildProductLookup(db, companyId);
        result = await bulkInsertStockLevels(
          db,
          companyId,
          warehouse.id,
          rows,
          productLookup,
        );
        break;
      }
      default:
        return { success: false, error: `Unknown entity type: ${entityType}` };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorImportFailed")),
    };
  }
}

// ============================================================================
// COMPLETE ONBOARDING
// ============================================================================

export async function completeOnboardingAction(): Promise<ActionResult> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();

    await completeOnboarding(db, companyId);

    // Update sequences to avoid collisions with imported data
    await updateSequencesAfterImport(db, companyId);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorCompleteOnboarding")),
    };
  }
}

// ============================================================================
// SAMPLE DATA SEEDING
// ============================================================================

export async function seedSampleDataAction(): Promise<ActionResult> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId, userId } = await getSession();
    await seedSampleData(db, companyId, userId);
    await completeOnboarding(db, companyId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSeedSampleData")),
    };
  }
}

export async function clearSampleDataAction(): Promise<ActionResult> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();
    await clearSampleData(db, companyId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorClearSampleData")),
    };
  }
}

// ============================================================================
// GET ONBOARDING STATE (for step routing)
// ============================================================================

export async function getOnboardingStateAction(): Promise<
  ActionResult<{
    step: number;
    completedAt: string | null;
    companyName: string | null;
  }>
> {
  const t = await getTranslations("onboarding");
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
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGetState")),
    };
  }
}

/**
 * Get company details for pre-filling the onboarding form.
 */
export async function getCompanyDetailsAction(): Promise<
  ActionResult<{
    name: string;
    legalName: string | null;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    country: string;
    vatNumber: string | null;
    settings: CompanySettings;
  }>
> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      return { success: false, error: t("errorCompanyNotFound") };
    }

    return {
      success: true,
      data: {
        name: company.name,
        legalName: company.legalName,
        address: company.address,
        postalCode: company.postalCode,
        city: company.city,
        country: company.country ?? "CH",
        vatNumber: company.vatNumber,
        settings: (company.settings as CompanySettings) || {},
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorGetCompanyDetails")),
    };
  }
}

// ============================================================================
// IMPORT: Products from kivitendo CSV
// ============================================================================

export async function importProductsFromCsvAction(
  rows: Array<Record<string, string | null>>,
): Promise<
  ActionResult<{ inserted: number; skipped: number; errors: string[] }>
> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();

    const groupNames = rows
      .map((r) => r.productGroup)
      .filter(Boolean) as string[];
    const manufacturerNames = rows
      .map((r) => r.manufacturer)
      .filter(Boolean) as string[];

    const productGroupMap = await ensureProductGroups(
      db,
      companyId,
      groupNames,
    );
    const manufacturerMap = await ensureManufacturers(
      db,
      companyId,
      manufacturerNames,
    );

    const result = await bulkInsertProducts(
      db,
      companyId,
      rows,
      productGroupMap,
      manufacturerMap,
    );

    // Keep sequences ahead of imported article numbers
    await updateSequencesAfterImport(db, companyId);

    revalidatePath("/products");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorProductImport")),
    };
  }
}

// ============================================================================
// REPAIR: Backfill document line items from CSV
// ============================================================================

export async function repairDocumentLineItemsAction(
  entityType: "invoice" | "purchase_invoice",
  structuredItems: Record<
    string,
    Array<{
      position: number;
      articleNumber: string;
      description: string;
      quantity: string;
      unit: string;
    }>
  >,
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const t = await getTranslations("onboarding");
  try {
    const { companyId } = await getSession();

    const productLookup = await buildProductLookup(db, companyId);
    let updated = 0;
    let skipped = 0;

    for (const [docNumber, items] of Object.entries(structuredItems)) {
      if (!items || items.length === 0) {
        skipped++;
        continue;
      }

      // Find matching document
      const [doc] = await db
        .select({ id: documents.id, total: documents.total })
        .from(documents)
        .where(
          and(
            eq(documents.companyId, companyId),
            eq(documents.number, docNumber),
            eq(documents.type, entityType),
          ),
        );

      if (!doc) {
        skipped++;
        continue;
      }

      await db.transaction(async (tx) => {
        // Delete existing line items
        await tx
          .delete(documentItems)
          .where(eq(documentItems.documentId, doc.id));

        const docTotal = doc.total ? new Decimal(doc.total) : new Decimal(0);

        // Insert new parsed items
        await tx.insert(documentItems).values(
          items.map((item) => {
            const product = item.articleNumber
              ? productLookup.get(item.articleNumber) || null
              : null;
            const productId = product?.id || null;
            const qty = item.quantity || "1";

            let unitPrice = "0";
            if (product?.unitPrice && product.unitPrice !== "0") {
              unitPrice = product.unitPrice;
            } else if (items.length === 1 && docTotal.gt(0)) {
              const qtyDec = new Decimal(qty || "1");
              if (qtyDec.gt(0)) {
                unitPrice = docTotal.div(qtyDec).toDecimalPlaces(2).toString();
              }
            }

            const total = new Decimal(qty || "0")
              .times(new Decimal(unitPrice))
              .toDecimalPlaces(2)
              .toString();

            return {
              documentId: doc.id,
              productId,
              position: item.position,
              description: item.description,
              quantity: qty,
              unitPrice,
              vatRate: DEFAULT_VAT_RATE,
              total,
            };
          }),
        );
      });

      updated++;
    }

    revalidatePath("/");
    return { success: true, data: { updated, skipped } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairLineItems")),
    };
  }
}
