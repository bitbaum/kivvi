import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";

const recordDataErasureSchema = z.object({
  item_identifier: z
    .string()
    .describe(
      "Item number (e.g. IT-00042) or item UUID. Use search_inventory to find the correct item.",
    ),
  method: z
    .enum(["secure_erase", "dban", "manual", "certified", "factory_reset"])
    .describe(
      "Erasure method used: secure_erase (ATA Secure Erase), dban (DBAN/Darik's Boot and Nuke), manual (manual wipe/degausser), certified (certified third-party service), factory_reset (for mobile devices).",
    ),
  notes: z
    .string()
    .max(500)
    .optional()
    .describe(
      "Optional notes, e.g. certificate number, tool version, or service provider name.",
    ),
});

export const recordDataErasureTool: Tool = {
  name: "record_data_erasure",
  description: `Record a data erasure event on an inventory item. Stamps the item with the erasure timestamp, method, and responsible user — creating an auditable GDPR compliance record. Required for secondhand IT devices before sale.

Supported methods:
- secure_erase: ATA Secure Erase (HDDs/SSDs)
- dban: DBAN / Darik's Boot and Nuke
- manual: Manual wipe or degausser
- certified: Certified third-party service (add certificate number in notes)
- factory_reset: For mobile devices (phones, tablets)

Examples:
- "Record Blancco erasure on item IT-00042"
- "Mark IT-00123 as data-erased using certified service, certificate #BL-2024-99"
- "Factory reset done on IT-00087"`,
  parameters: recordDataErasureSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof recordDataErasureSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { recordDataErasure } =
        await import("@kivvi/core/src/domain/inventory-items");
      const db = getDb(context);

      const row = await resolveInventoryItem(
        db,
        context.companyId,
        params.item_identifier,
      );
      if (!row) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item.`,
        };
      }

      await recordDataErasure(db, context.companyId, row.id, {
        method: params.method,
        userId: context.userId,
        notes: params.notes,
      });

      const methodLabels: Record<string, string> = {
        secure_erase: "ATA Secure Erase",
        dban: "DBAN",
        manual: "Manual / Degausser",
        certified: "Certified Service",
        factory_reset: "Factory Reset",
      };

      const wasAlreadyErased = row.dataErasuredAt !== null;
      const notesText = params.notes ? ` (${params.notes})` : "";

      return {
        success: true,
        message: `Data erasure recorded on ${row.itemNumber}: ${methodLabels[params.method]}${notesText}.${wasAlreadyErased ? " Note: item had a previous erasure record — this replaces it." : ""}`,
        data: {
          itemId: row.id,
          itemNumber: row.itemNumber,
          method: params.method,
          methodLabel: methodLabels[params.method],
          notes: params.notes ?? null,
          erasedAt: new Date().toISOString(),
        },
        actions: [
          {
            label: `View ${row.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${row.id}` },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to record data erasure: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
