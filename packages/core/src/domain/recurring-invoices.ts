import { z } from "zod";
import { eq, and, lte, desc, inArray } from "drizzle-orm";
import {
  recurringInvoiceConfigs,
  documents,
  documentItems,
  contacts,
  users,
} from "@kivvi/database";
import { DEFAULT_LOCALE } from "../config/locale";
import type {
  Database,
  RecurringInvoiceConfig,
  RecurringPeriodicity,
} from "@kivvi/database";
import { RECURRING_PERIODICITY_VALUES } from "@kivvi/database/src/enums";
import { convertDocument } from "./documents";
import { buildInvoiceEmailSubject } from "./email";
import { logger } from "../logger";
import { DATE_REGEX } from "../utils/validation-patterns";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const createRecurringConfigSchema = z.object({
  orderId: z.string().uuid(),
  periodicity: z.enum(RECURRING_PERIODICITY_VALUES),
  startDate: z.string().regex(DATE_REGEX, "Invalid date"),
  endDate: z.string().regex(DATE_REGEX, "Invalid date").optional().nullable(),
  autoExtensionMonths: z.number().int().min(1).max(60).optional().nullable(),
  emailRecipients: z.array(z.string().email()).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateRecurringConfigSchema = z.object({
  isActive: z.boolean().optional(),
  periodicity: z.enum(RECURRING_PERIODICITY_VALUES).optional(),
  startDate: z.string().regex(DATE_REGEX, "Invalid date").optional(),
  endDate: z.string().regex(DATE_REGEX, "Invalid date").optional().nullable(),
  autoExtensionMonths: z.number().int().min(1).max(60).optional().nullable(),
  emailRecipients: z.array(z.string().email()).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateRecurringConfigInput = z.infer<
  typeof createRecurringConfigSchema
>;
export type UpdateRecurringConfigInput = z.infer<
  typeof updateRecurringConfigSchema
>;

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Calculate next generation date based on periodicity.
 */
function calculateNextDate(
  date: Date,
  periodicity: RecurringPeriodicity,
): Date {
  const next = new Date(date);

  switch (periodicity) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Format date to ISO string (YYYY-MM-DD).
 */
function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse ISO date string to Date object.
 */
function parseISODate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

/**
 * Calculate period dates for variable substitution.
 * Returns { start, end } dates for the billing period.
 */
function calculatePeriodDates(
  generationDate: Date,
  periodicity: RecurringPeriodicity,
): { start: Date; end: Date } {
  const start = new Date(generationDate);
  const end = calculateNextDate(start, periodicity);
  end.setDate(end.getDate() - 1); // Last day of period

  return { start, end };
}

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

/**
 * Replace template variables in text with actual values.
 *
 * Supported variables (Kivitendo-compatible):
 * - <%period_start_date%> - Period start (DD.MM.YYYY)
 * - <%period_end_date%> - Period end (DD.MM.YYYY)
 * - <%current_month%> - Month name (e.g., "Januar")
 * - <%current_year%> - Year (e.g., "2026")
 * - <%current_quarter%> - Quarter (e.g., "Q1")
 */
function substituteVariables(
  text: string,
  generationDate: Date,
  periodicity: RecurringPeriodicity,
): string {
  const { start, end } = calculatePeriodDates(generationDate, periodicity);

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  const quarter = `Q${Math.floor(start.getMonth() / 3) + 1}`;

  return text
    .replace(/<%period_start_date%>/g, start.toLocaleDateString(DEFAULT_LOCALE))
    .replace(/<%period_end_date%>/g, end.toLocaleDateString(DEFAULT_LOCALE))
    .replace(/<%current_month%>/g, monthNames[start.getMonth()])
    .replace(/<%current_year%>/g, start.getFullYear().toString())
    .replace(/<%current_quarter%>/g, quarter);
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new recurring invoice configuration.
 */
export async function createRecurringConfig(
  db: Database,
  companyId: string,
  input: CreateRecurringConfigInput,
): Promise<RecurringInvoiceConfig> {
  // Verify order exists and belongs to company
  const order = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, input.orderId),
      eq(documents.companyId, companyId),
    ),
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.type !== "order") {
    throw new Error("Can only create recurring invoices from orders");
  }

  const startDate = parseISODate(input.startDate);
  const nextGenDate = calculateNextDate(startDate, input.periodicity);

  const [config] = await db
    .insert(recurringInvoiceConfigs)
    .values({
      companyId,
      orderId: input.orderId,
      periodicity: input.periodicity,
      startDate: input.startDate,
      endDate: input.endDate || null,
      autoExtensionMonths: input.autoExtensionMonths || null,
      emailRecipients: input.emailRecipients || null,
      notes: input.notes || null,
      nextGenerationDate: toISODate(nextGenDate),
      isActive: true,
    })
    .returning();

  return config;
}

/**
 * Update an existing recurring invoice configuration.
 */
export async function updateRecurringConfig(
  db: Database,
  companyId: string,
  configId: string,
  input: UpdateRecurringConfigInput,
): Promise<RecurringInvoiceConfig> {
  // Verify config exists and belongs to company
  const existing = await db.query.recurringInvoiceConfigs.findFirst({
    where: and(
      eq(recurringInvoiceConfigs.id, configId),
      eq(recurringInvoiceConfigs.companyId, companyId),
    ),
  });

  if (!existing) {
    throw new Error("Recurring invoice config not found");
  }

  // If periodicity or start date changed, recalculate next generation date
  let nextGenerationDate = existing.nextGenerationDate;
  if (input.periodicity || input.startDate) {
    const periodicity = input.periodicity || existing.periodicity;
    const startDate = parseISODate(input.startDate || existing.startDate);
    const lastGenDate = existing.lastGeneratedDate
      ? parseISODate(existing.lastGeneratedDate)
      : startDate;
    nextGenerationDate = toISODate(calculateNextDate(lastGenDate, periodicity));
  }

  const [updated] = await db
    .update(recurringInvoiceConfigs)
    .set({
      ...input,
      nextGenerationDate,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(recurringInvoiceConfigs.id, configId),
        eq(recurringInvoiceConfigs.companyId, companyId),
      ),
    )
    .returning();

  return updated;
}

/**
 * Delete a recurring invoice configuration.
 */
export async function deleteRecurringConfig(
  db: Database,
  companyId: string,
  configId: string,
): Promise<void> {
  const result = await db
    .delete(recurringInvoiceConfigs)
    .where(
      and(
        eq(recurringInvoiceConfigs.id, configId),
        eq(recurringInvoiceConfigs.companyId, companyId),
      ),
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Recurring invoice config not found");
  }
}

/**
 * List all recurring invoice configurations for a company.
 */
export async function listRecurringConfigs(
  db: Database,
  companyId: string,
): Promise<
  Array<RecurringInvoiceConfig & { orderNumber: string; contactName: string }>
> {
  const configs = await db
    .select({
      config: recurringInvoiceConfigs,
      orderNumber: documents.number,
      contactName: documents.contactId,
    })
    .from(recurringInvoiceConfigs)
    .leftJoin(documents, eq(recurringInvoiceConfigs.orderId, documents.id))
    .where(eq(recurringInvoiceConfigs.companyId, companyId))
    .orderBy(desc(recurringInvoiceConfigs.createdAt));

  // Fetch contact names
  const contactIds = configs
    .map((c) => c.contactName)
    .filter((id): id is string => id !== null);

  const contacts =
    contactIds.length > 0
      ? await db.query.contacts.findMany({
          where: (contacts, { inArray }) => inArray(contacts.id, contactIds),
          columns: { id: true, name: true },
        })
      : [];

  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

  return configs.map((c) => ({
    ...c.config,
    orderNumber: c.orderNumber || "Unknown",
    contactName: c.contactName
      ? contactMap.get(c.contactName) || "Unknown"
      : "No Contact",
  }));
}

/**
 * Get a single recurring invoice configuration.
 */
export async function getRecurringConfig(
  db: Database,
  companyId: string,
  configId: string,
): Promise<RecurringInvoiceConfig> {
  const config = await db.query.recurringInvoiceConfigs.findFirst({
    where: and(
      eq(recurringInvoiceConfigs.id, configId),
      eq(recurringInvoiceConfigs.companyId, companyId),
    ),
  });

  if (!config) {
    throw new Error("Recurring invoice config not found");
  }

  return config;
}

// ============================================================================
// INVOICE GENERATION (CRON JOB LOGIC)
// ============================================================================

export interface ProcessResult {
  processed: number;
  generated: number;
  errors: Array<{ configId: string; error: string }>;
}

export interface GeneratedInvoiceInfo {
  id: string;
  number: string;
  type: string;
  total: string;
  currency: string;
  dueDate: string | null;
  contact: { name: string; email: string | null } | null;
  companyId: string;
}

export interface ProcessOptions {
  onInvoiceGenerated?: (
    invoice: GeneratedInvoiceInfo,
    emailRecipients: string[],
  ) => Promise<void>;
}

/**
 * Process all active recurring invoice configurations.
 * Called by cron job daily.
 */
export async function processRecurringInvoices(
  db: Database,
  options?: ProcessOptions,
): Promise<ProcessResult> {
  const today = toISODate(new Date());

  // Find all active configs where nextGenerationDate <= today
  const dueConfigs = await db.query.recurringInvoiceConfigs.findMany({
    where: and(
      eq(recurringInvoiceConfigs.isActive, true),
      lte(recurringInvoiceConfigs.nextGenerationDate, today),
    ),
    with: {
      order: {
        with: {
          items: true,
          contact: true,
        },
      },
    },
  });

  const result: ProcessResult = {
    processed: dueConfigs.length,
    generated: 0,
    errors: [],
  };

  for (const config of dueConfigs) {
    try {
      // Check if end date has passed
      if (config.endDate && config.endDate < today) {
        // Check if auto-extension is enabled
        if (config.autoExtensionMonths) {
          const endDate = parseISODate(config.endDate);
          endDate.setMonth(endDate.getMonth() + config.autoExtensionMonths);

          await db
            .update(recurringInvoiceConfigs)
            .set({ endDate: toISODate(endDate) })
            .where(
              and(
                eq(recurringInvoiceConfigs.id, config.id),
                eq(recurringInvoiceConfigs.companyId, config.companyId),
              ),
            );
        } else {
          // Deactivate config
          await db
            .update(recurringInvoiceConfigs)
            .set({ isActive: false })
            .where(
              and(
                eq(recurringInvoiceConfigs.id, config.id),
                eq(recurringInvoiceConfigs.companyId, config.companyId),
              ),
            );
          continue;
        }
      }

      const generationDate = new Date();

      // Apply variable substitution to order notes
      let notes = config.order.notes || "";
      if (notes) {
        notes = substituteVariables(notes, generationDate, config.periodicity);
      }

      // Generate invoice by converting order
      // Note: userId is not tracked for automated cron jobs - use system user concept or null
      const invoice = await db.transaction(async (tx) => {
        // Convert order to invoice
        // For automated generation, we don't have a userId - use first user from company as fallback
        const firstUser = await tx.query.users.findFirst({
          where: (users, { eq }) => eq(users.companyId, config.companyId),
          columns: { id: true },
        });

        if (!firstUser) {
          throw new Error(`No users found for company ${config.companyId}`);
        }

        const inv = await convertDocument(
          tx,
          config.companyId,
          firstUser.id,
          config.orderId,
          "invoice",
        );

        // Update invoice with substituted notes if applicable
        if (notes !== config.order.notes) {
          const [updated] = await tx
            .update(documents)
            .set({ notes })
            .where(
              and(
                eq(documents.id, inv.id),
                eq(documents.companyId, config.companyId),
              ),
            )
            .returning();
          return updated;
        }

        return inv;
      });

      // Update recurring config
      const nextGenDate = calculateNextDate(
        new Date(config.nextGenerationDate),
        config.periodicity,
      );

      await db
        .update(recurringInvoiceConfigs)
        .set({
          lastGeneratedDate: today,
          nextGenerationDate: toISODate(nextGenDate),
        })
        .where(
          and(
            eq(recurringInvoiceConfigs.id, config.id),
            eq(recurringInvoiceConfigs.companyId, config.companyId),
          ),
        );

      // Send email if recipients configured and callback provided
      if (
        options?.onInvoiceGenerated &&
        config.emailRecipients &&
        config.emailRecipients.length > 0
      ) {
        try {
          await options.onInvoiceGenerated(
            {
              id: invoice.id,
              number: invoice.number,
              type: invoice.type,
              total: invoice.total,
              currency: invoice.currency,
              dueDate: invoice.dueDate
                ? invoice.dueDate.toISOString().split("T")[0]
                : null,
              contact: config.order.contact
                ? {
                    name: config.order.contact.name,
                    email: config.order.contact.email,
                  }
                : null,
              companyId: config.companyId,
            },
            config.emailRecipients,
          );
        } catch (emailError) {
          logger.error(
            `Failed to send email for invoice ${invoice.number}`,
            emailError,
          );
        }
      }

      result.generated++;
    } catch (error) {
      result.errors.push({
        configId: config.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}

export interface OrderOption {
  id: string;
  number: string;
  contactName: string | null;
}

export async function getOrderOptionsForRecurring(
  db: Database,
  companyId: string,
): Promise<OrderOption[]> {
  const orders = await db
    .select({
      id: documents.id,
      number: documents.number,
      contactId: documents.contactId,
    })
    .from(documents)
    .where(and(eq(documents.companyId, companyId), eq(documents.type, "order")))
    .orderBy(documents.number);

  const contactIds = orders
    .map((o) => o.contactId)
    .filter((id): id is string => id !== null);

  const contactRows =
    contactIds.length > 0
      ? await db
          .select({ id: contacts.id, name: contacts.name })
          .from(contacts)
          .where(inArray(contacts.id, contactIds))
      : [];

  const contactMap = new Map(contactRows.map((c) => [c.id, c.name]));

  return orders.map((o) => ({
    id: o.id,
    number: o.number ?? "",
    contactName: o.contactId ? (contactMap.get(o.contactId) ?? null) : null,
  }));
}
