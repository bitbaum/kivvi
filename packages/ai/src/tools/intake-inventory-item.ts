import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";
import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";

const intakeInventoryItemSchema = z.object({
  description: z
    .string()
    .min(1)
    .describe(
      'What the item is — model name, key specs (e.g. "Lenovo ThinkPad T490, i5, 16GB, 256GB SSD")',
    ),
  quantity: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe(
      "Number of identical items to intake. Each becomes a separate tracked item with its own number.",
    ),
  condition: z
    .enum(ITEM_CONDITION_VALUES)
    .default("untested")
    .describe(
      'Initial condition: "untested" (default, needs assessment), "good", "fair", "poor", "like_new", "parts_only", "scrap"',
    ),
  donor_name: z
    .string()
    .optional()
    .describe(
      "Name of the organisation or person donating the item (partial match). Used to look up the donor contact.",
    ),
  category: z
    .string()
    .optional()
    .describe('Item category (e.g. "laptop", "monitor", "desktop", "phone", "printer")'),
  serial_number: z.string().optional().describe("Serial number if known (only for single items)"),
  estimated_value: z
    .number()
    .nonnegative()
    .optional()
    .describe("Estimated acquisition/replacement value in CHF"),
  asking_price: z.number().nonnegative().optional().describe("Desired sale price in CHF"),
  location: z
    .string()
    .optional()
    .describe('Physical shelf/bin location within the warehouse (e.g. "A3-B2", "Regal 5")'),
  notes: z.string().optional().describe("Any additional notes about the item"),
});

export const intakeInventoryItemTool: Tool = {
  name: "intake_inventory_item",
  description: `Register one or more incoming items into inventory (intake flow). Each item gets a unique tracking number (IT-00001 format) and starts in "intake" status. For bulk donations, set quantity > 1 and identical items are created with sequential numbers.

Examples:
- "50 laptops donated by UBS" → quantity: 50, donor_name: "UBS"
- "3 monitors from Revamp IT, fair condition, CHF 40 asking price each"
- "1 ThinkPad T490, serial MJ12345, good condition, shelf A3-B2"
- "intake 10 printers from Zurich city, parts only"`,
  parameters: intakeInventoryItemSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof intakeInventoryItemSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { createInventoryItem } = await import("@kivvi/core/src/domain/inventory-items");
      const { contacts } = await import("@kivvi/database");
      const db = getDb(context);

      // Resolve donor contact by name (optional)
      let donorContactId: string | null = null;
      let donorName: string | null = null;
      if (params.donor_name) {
        const [match] = await db
          .select({ id: contacts.id, name: contacts.name })
          .from(contacts)
          .where(
            and(
              eq(contacts.companyId, context.companyId),
              ilike(contacts.name, `%${params.donor_name}%`),
            ),
          )
          .limit(1);

        if (match) {
          donorContactId = match.id;
          donorName = match.name;
        }
      }

      const qty = params.quantity ?? 1;
      const serialOnlyForSingle = qty === 1 ? (params.serial_number ?? null) : null;

      const created = [];
      for (let i = 0; i < qty; i++) {
        const item = await createInventoryItem(db, context.companyId, {
          description: params.description,
          condition: params.condition ?? "untested",
          category: params.category ?? null,
          donorContactId,
          estimatedValue: params.estimated_value ? String(params.estimated_value) : null,
          askingPrice: params.asking_price ? String(params.asking_price) : null,
          location: params.location ?? null,
          notes: params.notes ?? null,
          serialNumber: serialOnlyForSingle,
        });
        created.push(item);
      }

      const currency = context.defaultCurrency ?? "CHF";
      const donorNote = donorName ? ` from ${donorName}` : "";
      const conditionNote =
        params.condition && params.condition !== "untested" ? `, ${params.condition}` : "";
      const priceNote = params.asking_price
        ? `, ${currency} ${params.asking_price.toFixed(2)} asking`
        : "";

      const firstNumber = created[0].itemNumber;
      const lastNumber = created[qty - 1].itemNumber;
      const rangeLabel = qty === 1 ? firstNumber : `${firstNumber}–${lastNumber}`;

      return {
        success: true,
        message: `Intake ${qty === 1 ? "item" : `${qty} items`} (${rangeLabel})${donorNote}${conditionNote}${priceNote}. Status: intake.${
          params.donor_name && !donorName
            ? ` Note: donor "${params.donor_name}" not found — donor not linked.`
            : ""
        }`,
        data: {
          count: qty,
          items: created.map((item) => ({
            id: item.id,
            itemNumber: item.itemNumber,
            description: item.description,
            condition: item.condition,
            status: item.status,
          })),
          donorContactId,
          donorName,
        },
        actions: [
          {
            label: qty === 1 ? `View ${firstNumber}` : "View Intake Queue",
            action: "navigate",
            params: {
              url: qty === 1 ? `/intake/items/${created[0].id}` : "/intake/items?status=intake",
            },
            variant: "primary",
          },
          ...(qty > 1
            ? []
            : [
                {
                  label: "Intake Queue",
                  action: "navigate",
                  params: { url: "/intake/items?status=intake" },
                },
              ]),
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to intake item: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
