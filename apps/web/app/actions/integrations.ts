"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { buildRicardoListingPayload } from "@kivvi/core/src/domain/ricardo";
import {
  publishListing,
  deleteListing,
  testConnection,
} from "@/lib/ricardo-client";
import { requireRole, safeErrorMessage, type ActionResult } from "./utils";

// ============================================================================
// RICARDO SETTINGS
// ============================================================================

export async function updateRicardoApiKeyAction(
  apiKey: string | null,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("admin");

    const [existing] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const current = (existing?.settings as CompanySettings) ?? {};

    // Only update if not the mask placeholder
    if (apiKey === "••••••••") {
      return { success: true };
    }

    const updatedSettings: CompanySettings = {
      ...current,
      ...(apiKey ? { ricardoApiKey: apiKey } : { ricardoApiKey: undefined }),
    };

    await db
      .update(companies)
      .set({ settings: updatedSettings, updatedAt: new Date() })
      .where(eq(companies.id, companyId));

    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to save Ricardo API key."),
    };
  }
}

export async function testRicardoConnectionAction(): Promise<
  ActionResult<void>
> {
  try {
    const { companyId } = await requireRole("admin");

    const [row] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (row?.settings as CompanySettings)?.ricardoApiKey;
    if (!apiKey) {
      return {
        success: false,
        error: "Kein Ricardo API-Schlüssel konfiguriert.",
      };
    }

    const result = await testConnection(apiKey);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Connection test failed."),
    };
  }
}

// ============================================================================
// PUBLISH / UNPUBLISH
// ============================================================================

export async function publishToRicardoAction(
  itemId: string,
): Promise<ActionResult<{ listingUrl: string }>> {
  try {
    const { companyId } = await requireRole("member");

    // Fetch company API key
    const [companyRow] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (companyRow?.settings as CompanySettings)?.ricardoApiKey;
    if (!apiKey) {
      return {
        success: false,
        error:
          "Kein Ricardo API-Schlüssel. Bitte zuerst in den Einstellungen konfigurieren.",
      };
    }

    // Fetch item — only sellable items can be listed
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.companyId, companyId),
        ),
      );

    if (!item) return { success: false, error: "Artikel nicht gefunden." };

    const sellableStatuses = ["ready_for_sale", "listed"];
    if (!sellableStatuses.includes(item.status)) {
      return {
        success: false,
        error:
          "Nur Artikel mit Status 'Verkaufsbereit' oder 'Gelistet' können auf Ricardo publiziert werden.",
      };
    }

    if (!item.askingPrice || parseFloat(item.askingPrice) <= 0) {
      return {
        success: false,
        error:
          "Der Artikel benötigt einen Verkaufspreis, um auf Ricardo publiziert zu werden.",
      };
    }

    // Build payload and publish
    const payload = buildRicardoListingPayload({
      itemNumber: item.itemNumber,
      description: item.description,
      condition: item.condition,
      askingPrice: item.askingPrice,
      photoBase64: item.photoBase64,
      category: item.category,
      notes: item.notes,
    });

    const { listingId, listingUrl } = await publishListing(apiKey, payload);

    // Store result on item
    await db
      .update(inventoryItems)
      .set({
        externalListingId: listingId,
        externalListingUrl: listingUrl,
        externalListingStatus: "active",
        status: "listed",
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true, data: { listingUrl } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Fehler beim Publizieren auf Ricardo."),
    };
  }
}

export async function unpublishFromRicardoAction(
  itemId: string,
): Promise<ActionResult<void>> {
  try {
    const { companyId } = await requireRole("member");

    const [companyRow] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId));

    const apiKey = (companyRow?.settings as CompanySettings)?.ricardoApiKey;

    const [item] = await db
      .select({
        externalListingId: inventoryItems.externalListingId,
        companyId: inventoryItems.companyId,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, itemId),
          eq(inventoryItems.companyId, companyId),
        ),
      );

    if (!item) return { success: false, error: "Artikel nicht gefunden." };

    if (apiKey && item.externalListingId) {
      try {
        await deleteListing(apiKey, item.externalListingId);
      } catch {
        // Best-effort — continue to clear local state even if API call fails
      }
    }

    await db
      .update(inventoryItems)
      .set({
        externalListingStatus: "removed",
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, itemId));

    revalidatePath(`/intake/items/${itemId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Fehler beim Entfernen von Ricardo."),
    };
  }
}
