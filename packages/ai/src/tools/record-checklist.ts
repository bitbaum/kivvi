import { z } from "zod";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb, resolveInventoryItem } from "./utils";

const checkResultSchema = z.object({
  id: z
    .string()
    .describe(
      "Check ID (e.g. power_on, display, keyboard, storage_smart, data_erasure, os_boots). Use get_item_details to see the item's category, then infer the relevant checks.",
    ),
  result: z.enum(["pass", "fail", "skip"]),
  value: z
    .string()
    .optional()
    .describe("For measurement checks (e.g. battery_pct): the measured value."),
  skip_reason: z
    .string()
    .optional()
    .describe("Required when result is 'skip' on a blocking check."),
});

const recordChecklistSchema = z.object({
  item_identifier: z.string().describe("Item number (e.g. IT-00042) or item UUID."),
  results: z
    .union([z.literal("all_pass"), z.array(checkResultSchema).min(1)])
    .describe(
      "Either 'all_pass' to mark every check as passed (fastest for simple items), or an array of specific results. With 'all_pass', all required checks get result=pass; measurement checks are skipped unless explicitly provided.",
    ),
});

export const recordChecklistTool: Tool = {
  name: "record_checklist",
  description: `Record quality-control checklist results for an inventory item. The checklist template is determined by the item's category (laptop, desktop, phone, tablet, monitor, etc.).

Use 'all_pass' when every check passes — the tool fills in all required checks automatically.
List specific results when some checks fail or need a measurement value.

Common check IDs:
- power_on, display, keyboard, trackpad — basic hardware
- battery_pct — measurement (value required, e.g. "87")
- storage_smart — storage health (blocking: fail → suggests repair)
- data_erasure — data wiped (blocking: confirm)
- os_installed, os_boots — software (blocking)

Completing data_erasure as "pass" also stamps the item's erasure timestamp.

Examples:
- "Complete all checklist items as passed for IT-00042"
- "Record laptop checklist for IT-00123: all pass except storage_smart failed"
- "Mark IT-00099 checklist: all pass, battery_pct = 72"`,
  parameters: recordChecklistSchema,
  requiredPermissions: ["product:write"],
  execute: async (
    params: z.infer<typeof recordChecklistSchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const { recordChecklist } = await import("@kivvi/core/src/domain/inventory-items");
      const { CHECKLIST_TEMPLATES, getChecklistTemplate } =
        await import("@kivvi/core/src/config/checklist-templates");
      const db = getDb(context);

      const row = await resolveInventoryItem(db, context.companyId, params.item_identifier);
      if (!row) {
        return {
          success: false,
          error: `Item "${params.item_identifier}" not found. Use search_inventory to find the correct item.`,
        };
      }

      // Determine category — fall back to "other" if not set
      const category = row.category ?? "other";
      const template = getChecklistTemplate(category);

      const now = new Date().toISOString();

      // Build completions list
      let completions: Array<{
        id: string;
        result: "pass" | "fail" | "skip";
        value?: string;
        skipReason?: string;
        completedAt: string;
        completedBy: string;
      }>;

      if (params.results === "all_pass") {
        // Fill every required check as pass; skip measurement checks
        // (they need a real value — we can't invent one)
        completions = template.checks
          .filter((c) => c.required && c.type !== "measurement")
          .map((c) => ({
            id: c.id,
            result: "pass" as const,
            completedAt: now,
            completedBy: context.userId,
          }));
      } else {
        // User-supplied results — attach timestamps and userId
        completions = params.results.map((r) => ({
          id: r.id,
          result: r.result,
          ...(r.value !== undefined ? { value: r.value } : {}),
          ...(r.skip_reason !== undefined ? { skipReason: r.skip_reason } : {}),
          completedAt: now,
          completedBy: context.userId,
        }));
      }

      if (completions.length === 0) {
        return {
          success: false,
          error: `No checks to record. Category "${category}" may not have required non-measurement checks. Try providing explicit results instead of "all_pass".`,
        };
      }

      await recordChecklist(db, context.companyId, row.id, {
        category,
        completions,
        userId: context.userId,
      });

      const passCount = completions.filter((c) => c.result === "pass").length;
      const failCount = completions.filter((c) => c.result === "fail").length;
      const skipCount = completions.filter((c) => c.result === "skip").length;

      const erasureStamped = completions.some(
        (c) => c.id === "data_erasure" && c.result === "pass",
      );

      const summary = [
        passCount > 0 ? `${passCount} passed` : null,
        failCount > 0 ? `${failCount} failed` : null,
        skipCount > 0 ? `${skipCount} skipped` : null,
      ]
        .filter(Boolean)
        .join(", ");

      const availableCategories = Object.keys(CHECKLIST_TEMPLATES).join(", ");

      return {
        success: true,
        message: `Checklist recorded for ${row.itemNumber} (${category}): ${summary}.${erasureStamped ? " Data erasure timestamp stamped." : ""}${failCount > 0 ? " Item may need repair — check failed items." : ""}`,
        data: {
          itemId: row.id,
          itemNumber: row.itemNumber,
          category,
          completionsRecorded: completions.length,
          passed: passCount,
          failed: failCount,
          skipped: skipCount,
          erasureStamped,
          availableCategories,
        },
        actions: [
          {
            label: `View ${row.itemNumber}`,
            action: "navigate",
            params: { url: `/intake/items/${row.id}` },
            variant: "primary",
          },
          ...(failCount > 0
            ? [
                {
                  label: "Repair Queue",
                  action: "navigate" as const,
                  params: { url: "/intake/repair-queue" },
                },
              ]
            : []),
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to record checklist: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
