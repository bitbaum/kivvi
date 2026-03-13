import { z } from "zod";
import Decimal from "decimal.js";
import type { Tool, ExecutionContext, ToolResult } from "../types";
import { getDb } from "./utils";

const journalLineSchema = z.object({
  accountCode: z
    .string()
    .describe(
      'Account code from the chart of accounts (e.g. "1020" for bank, "3000" for revenue)',
    ),
  debit: z
    .string()
    .optional()
    .describe(
      'Debit amount as string (e.g. "1500.00"). Either debit or credit must be provided, not both.',
    ),
  credit: z
    .string()
    .optional()
    .describe(
      'Credit amount as string (e.g. "1500.00"). Either debit or credit must be provided, not both.',
    ),
});

const createJournalEntrySchema = z.object({
  date: z
    .string()
    .describe("Journal entry date in ISO 8601 format (YYYY-MM-DD)"),
  reference: z
    .string()
    .describe("Reference number or identifier for this entry"),
  description: z
    .string()
    .describe(
      'Description of the journal entry (e.g. "Rent payment January 2026")',
    ),
  lines: z
    .array(journalLineSchema)
    .min(2)
    .describe(
      "Journal entry lines. Must have at least 2 lines and total debits must equal total credits.",
    ),
});

export const createJournalEntryTool: Tool = {
  name: "create_journal_entry",
  description: `Create a manual journal entry in the general ledger. Requires at least 2 lines where total debits equal total credits (double-entry bookkeeping). Use account codes from the Swiss KMU chart of accounts (e.g. 1020 = Bank, 3000 = Revenue, 4000 = Material costs).`,
  parameters: createJournalEntrySchema,
  requiredPermissions: ["accounting:write"],
  execute: async (
    params: z.infer<typeof createJournalEntrySchema>,
    context: ExecutionContext,
  ): Promise<ToolResult> => {
    try {
      // Validate debits equal credits before calling domain function
      const totalDebits = params.lines.reduce(
        (sum, l) => sum.plus(new Decimal(l.debit || "0")),
        new Decimal(0),
      );
      const totalCredits = params.lines.reduce(
        (sum, l) => sum.plus(new Decimal(l.credit || "0")),
        new Decimal(0),
      );

      if (!totalDebits.minus(totalCredits).abs().lte("0.005")) {
        return {
          success: false,
          error: `Journal entry does not balance. Total debits: ${totalDebits.toFixed(2)}, total credits: ${totalCredits.toFixed(2)}. Difference: ${totalDebits.minus(totalCredits).toFixed(2)}.`,
        };
      }

      const { createJournalEntry, listAccounts } = await import("@kivvi/core");
      const db = getDb(context);

      // Resolve account codes to account IDs
      const allAccounts = await listAccounts(db, context.companyId);
      const codeToAccount = new Map(allAccounts.map((a) => [a.code, a]));

      const resolvedLines = params.lines.map((line) => {
        const account = codeToAccount.get(line.accountCode);
        if (!account) {
          throw new Error(
            `Account with code "${line.accountCode}" not found in chart of accounts`,
          );
        }
        return {
          accountId: account.id,
          debit: line.debit || null,
          credit: line.credit || null,
        };
      });

      const entry = await createJournalEntry(
        db,
        context.companyId,
        context.userId,
        {
          date: params.date,
          reference: params.reference,
          description: params.description,
          lines: resolvedLines,
        },
      );

      return {
        success: true,
        message: `Created journal entry "${params.reference}" dated ${params.date} for ${context.defaultCurrency} ${totalDebits.toFixed(2)}.`,
        data: {
          id: entry.id,
          date: params.date,
          reference: params.reference,
          description: params.description,
          totalAmount: `${context.defaultCurrency} ${totalDebits.toFixed(2)}`,
          lineCount: params.lines.length,
          lines: params.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: codeToAccount.get(l.accountCode)?.name || "Unknown",
            debit: l.debit ? `${context.defaultCurrency} ${l.debit}` : null,
            credit: l.credit ? `${context.defaultCurrency} ${l.credit}` : null,
          })),
        },
        actions: [
          {
            label: "View Journal",
            action: "navigate",
            params: { url: "/accounting/journal" },
            variant: "primary",
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create journal entry: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
