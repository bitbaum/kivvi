/**
 * Repair-labor revenue leakage — logged work that never became invoiceable.
 *
 * Refurbishers log repair hours on inventory items (`repairHours`) but often
 * forget to bill that labor as a service line. That is silent revenue leakage.
 * This surfaces items with logged hours that are still in stock and have no
 * repair-labor invoice yet, so the AI can prompt "you logged 3h on IT-00042 —
 * bill it?" (roadmap item 8: labor-to-invoice prompts).
 *
 * Detection is read-only and advisory: it never creates anything. The link to
 * an existing labor invoice is the marker `createRepairLaborInvoice` writes into
 * `internalNotes` (`... (<itemId>) ...`) — the same SSOT that records the bill.
 */

import Decimal from "decimal.js";
import { and, eq, ilike, notInArray, sql } from "drizzle-orm";
import { companies, documents, inventoryItems } from "@kivvi/database";
import type {
  Database,
  ItemStatusValue,
  CompanySettings,
} from "@kivvi/database";
import { calculateRepairLaborAmount } from "./documents";

/** Statuses where labor is no longer separately billable (sold/closed out). */
const CLOSED_STATUSES: ItemStatusValue[] = [
  "sold",
  "returned",
  "donated",
  "recycled",
];

export interface RepairLaborLeakageItem {
  itemId: string;
  itemNumber: string;
  description: string;
  status: ItemStatusValue;
  repairHours: string;
  /** hours × default rate, or null when no default repair rate is configured. */
  suggestedAmount: string | null;
}

export interface RepairLaborLeakageReport {
  hourlyRate: string | null;
  items: RepairLaborLeakageItem[];
  totalHours: string;
  totalSuggestedAmount: string | null;
}

/** Extract the inventory-item id a repair-labor invoice links back to. */
function linkedItemId(internalNotes: string | null): string | null {
  if (!internalNotes) return null;
  const match = internalNotes.match(/\(([0-9a-f-]{36})\)/i);
  return match ? match[1] : null;
}

/**
 * Find inventory items with logged repair hours that are still in stock and
 * have not yet been billed for labor. Pure read; safe to run on any schedule.
 */
export async function findUninvoicedRepairLabor(
  db: Database,
  companyId: string,
): Promise<RepairLaborLeakageReport> {
  // Candidates: logged hours, not yet closed out.
  const candidates = await db
    .select({
      itemId: inventoryItems.id,
      itemNumber: inventoryItems.itemNumber,
      description: inventoryItems.description,
      status: inventoryItems.status,
      repairHours: inventoryItems.repairHours,
    })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.companyId, companyId),
        sql`${inventoryItems.repairHours} IS NOT NULL`,
        sql`${inventoryItems.repairHours}::numeric > 0`,
        notInArray(inventoryItems.status, CLOSED_STATUSES),
      ),
    );

  // Items that already have a repair-labor invoice → exclude them.
  const laborInvoices = await db
    .select({ internalNotes: documents.internalNotes })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        ilike(documents.internalNotes, "Repair labor for inventory item%"),
      ),
    );

  const alreadyBilled = new Set(
    laborInvoices
      .map((d) => linkedItemId(d.internalNotes))
      .filter((id): id is string => id !== null),
  );

  // Company default repair rate (the amount the AI would suggest billing).
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const settings = (company?.settings as CompanySettings | undefined) ?? {};
  const hourlyRate = settings.defaultRepairHourlyRate ?? null;

  let totalHours = new Decimal(0);
  let totalSuggested = new Decimal(0);
  let anySuggested = false;

  const items: RepairLaborLeakageItem[] = candidates
    .filter((c) => !alreadyBilled.has(c.itemId))
    .map((c) => {
      const hours = c.repairHours ?? "0";
      totalHours = totalHours.plus(hours);
      let suggestedAmount: string | null = null;
      if (hourlyRate) {
        suggestedAmount = calculateRepairLaborAmount(hours, hourlyRate);
        totalSuggested = totalSuggested.plus(suggestedAmount);
        anySuggested = true;
      }
      return {
        itemId: c.itemId,
        itemNumber: c.itemNumber,
        description: c.description,
        status: c.status,
        repairHours: hours,
        suggestedAmount,
      };
    });

  return {
    hourlyRate,
    items,
    totalHours: totalHours.toFixed(2),
    totalSuggestedAmount: anySuggested ? totalSuggested.toFixed(2) : null,
  };
}
