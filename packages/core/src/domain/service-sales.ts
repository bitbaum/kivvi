/**
 * Service-sale bridge — revamp-it paid service flows → Kivvi ERP projection.
 *
 * revamp-it owns the workflow (workshop scheduling, appointment booking,
 * IT-Hilfe queue). Kivvi only accounts for the money outcome: when one of those
 * flows is PAID, revamp-it POSTs it here and Kivvi books exactly one service
 * invoice + one payment, atomically, routed to service revenue (3200).
 *
 * This is deliberately ONE function for all paid-service sources (roadmap
 * implementation items 4, 5 and 6). They share an identical economic shape —
 * a paid service line — and differ only by a `source` discriminator. Building a
 * separate endpoint per flow would violate DRY for no gain.
 *
 * Idempotency (Ground Truth #1 — a transaction either happened or it didn't):
 *  - The whole invoice+payment runs in one db.transaction, so a mid-way failure
 *    rolls back completely, leaving nothing to reconcile.
 *  - Durable replay: the natural key `service-sale:{source}:{sourceId}` is stored
 *    on the invoice (`internalNotes`) and checked first, so a replayed webhook
 *    (even after the idempotency table is pruned) returns the original invoice.
 *  - Concurrency: two near-simultaneous first-time requests are serialised by a
 *    domain-level claim on the `apiIdempotencyKeys` table, whose unique
 *    `(company_id, key)` index makes the DB — not a read-then-write check — the
 *    SSOT for "this source is booked once". No new schema needed. This holds
 *    even when the caller omits the `/api/v1` `Idempotency-Key` header.
 */

import { z } from "zod";
import Decimal from "decimal.js";
import { and, eq } from "drizzle-orm";
import { documents } from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { PAYMENT_METHOD_VALUES } from "@kivvi/database";
import {
  createDocument,
  updateDocumentStatus,
  recordPayment,
  getOrCreateServiceProduct,
} from "./documents";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from "./idempotency";
import { resolveOrCreateContact } from "./contacts";
import { DEFAULT_CURRENCY } from "../config/locale";
import { DEFAULT_VAT_RATE } from "../config/vat-rates";
import { AMOUNT_REGEX } from "../utils/validation-patterns";

/** Paid revamp-it service flows that bridge into Kivvi as service revenue. */
export const SERVICE_SALE_SOURCES = [
  "workshop",
  "appointment",
  "it_hilfe",
  "other",
] as const;
export type ServiceSaleSource = (typeof SERVICE_SALE_SOURCES)[number];

/** Per-source service product (SKU is the SSOT that maps a flow to its product). */
const SERVICE_SALE_PRODUCTS: Record<
  ServiceSaleSource,
  { sku: string; name: string }
> = {
  workshop: { sku: "service-workshop", name: "Workshop" },
  appointment: { sku: "service-appointment", name: "Appointment" },
  it_hilfe: { sku: "service-it-hilfe", name: "IT-Hilfe" },
  other: { sku: "service-other", name: "Service" },
};

export const recordServiceSaleSchema = z
  .object({
    source: z.enum(SERVICE_SALE_SOURCES),
    /** revamp-it's registration / appointment / payment id — the natural key. */
    sourceId: z.string().min(1).max(200),
    contactId: z.string().uuid().optional(),
    contactName: z.string().min(1).max(200).optional(),
    contactEmail: z.string().email().optional(),
    description: z.string().min(1).max(500),
    /**
     * NET unit price (VAT added on top) — consistent with the rest of Kivvi's
     * document model, where `unitPrice` is always net. revamp-it must send net.
     */
    amount: z
      .string()
      .regex(AMOUNT_REGEX, "Amount must be a decimal like 80.00")
      .refine((v) => new Decimal(v).gt(0), "Amount must be greater than 0"),
    quantity: z
      .string()
      .regex(AMOUNT_REGEX, "Invalid quantity")
      .refine((v) => new Decimal(v).gt(0), "Quantity must be greater than 0")
      .default("1"),
    vatRate: z
      .string()
      .regex(AMOUNT_REGEX, "Invalid VAT rate")
      .default(DEFAULT_VAT_RATE),
    issueDate: z.string().optional(),
    paidAt: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_VALUES).default("card"),
    paymentReference: z.string().max(200).optional(),
  })
  .refine((d) => Boolean(d.contactId || d.contactName), {
    message: "Either contactId or contactName is required",
    path: ["contactId"],
  });

export type RecordServiceSaleInput = z.input<typeof recordServiceSaleSchema>;

export interface ServiceSaleResult {
  invoiceId: string;
  number: string;
  status: string;
  total: string;
  currency: string;
  /** True when a prior identical bridge call was replayed (no new booking). */
  replayed: boolean;
}

/** The durable idempotency marker stored on the bridged invoice. */
export function serviceSaleKey(source: ServiceSaleSource, sourceId: string) {
  return `service-sale:${source}:${sourceId}`;
}

/** Find an already-bridged invoice by its durable natural-key marker. */
async function findBridgedInvoice(
  db: Database,
  companyId: string,
  key: string,
): Promise<ServiceSaleResult | null> {
  const [existing] = await db
    .select({
      id: documents.id,
      number: documents.number,
      status: documents.status,
      total: documents.total,
      currency: documents.currency,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        eq(documents.internalNotes, key),
      ),
    )
    .limit(1);

  if (!existing) return null;
  return {
    invoiceId: existing.id,
    number: existing.number,
    status: existing.status,
    total: existing.total,
    currency: existing.currency,
    replayed: true,
  };
}

/**
 * Book a paid revamp-it service flow as one service invoice + one payment.
 * Idempotent by (companyId, source, sourceId). Safe to call twice, concurrently.
 */
export async function recordServiceSale(
  db: Database,
  companyId: string,
  userId: string,
  input: RecordServiceSaleInput,
): Promise<ServiceSaleResult> {
  const v = recordServiceSaleSchema.parse(input);
  const key = serviceSaleKey(v.source, v.sourceId);

  // 1. Durable replay — a prior booking committed this marker (survives pruning).
  const durable = await findBridgedInvoice(db, companyId, key);
  if (durable) return durable;

  // 2. Concurrency guard — the unique (company_id, key) index on the idempotency
  //    table lets exactly one caller win. Distinct namespace so it never
  //    collides with the route-level HTTP Idempotency-Key.
  const lockKey = `service-sale-lock:${v.source}:${v.sourceId}`;
  const claim = await claimIdempotencyKey(
    db,
    companyId,
    lockKey,
    "POST",
    "service-sales",
  );
  if (claim.outcome !== "claimed") {
    // A concurrent booking won the race. Its invoice may already be committed.
    const now = await findBridgedInvoice(db, companyId, key);
    if (now) return now;
    throw new Error(
      "A service sale for this source is already being processed; retry shortly",
    );
  }

  try {
    const contactId =
      v.contactId ??
      (await resolveOrCreateContact(
        db,
        companyId,
        v.contactName!,
        v.contactEmail,
      ));

    const product = SERVICE_SALE_PRODUCTS[v.source];
    const issueDate = v.issueDate ?? new Date().toISOString().split("T")[0];
    const paidAt = v.paidAt ?? issueDate;

    // One transaction: invoice + sent-journal + payment commit together or not
    // at all. Nested calls open savepoints — the same pattern the repair-labor
    // route already relies on.
    const invoice = await db.transaction(async (tx) => {
      const productId = await getOrCreateServiceProduct(tx, companyId, {
        sku: product.sku,
        name: product.name,
        description: `${product.name} service revenue bridged from revamp-it`,
        unitPrice: v.amount,
        vatRate: v.vatRate,
      });

      const created = await createDocument(tx, companyId, userId, {
        type: "invoice",
        contactId,
        issueDate,
        currency: DEFAULT_CURRENCY,
        internalNotes: key,
        items: [
          {
            productId,
            position: 0,
            description: v.description,
            quantity: v.quantity,
            unitPrice: v.amount,
            discount: "0",
            vatRate: v.vatRate,
          },
        ],
      });

      // Sent posts AR + service revenue (3200) + VAT journal lines.
      await updateDocumentStatus(tx, companyId, created.id, "sent");

      // Full payment against the invoice total (gross) → status paid.
      await recordPayment(tx, companyId, created.id, {
        amount: created.total,
        date: paidAt,
        method: v.paymentMethod,
        reference: v.paymentReference ?? key,
      });

      return created;
    });

    await completeIdempotencyKey(db, companyId, lockKey, 200, {
      invoiceId: invoice.id,
    });

    return {
      invoiceId: invoice.id,
      number: invoice.number,
      status: "paid",
      total: invoice.total,
      currency: invoice.currency,
      replayed: false,
    };
  } catch (error) {
    // Booking failed — free the lock so a genuine retry can proceed.
    await releaseIdempotencyKey(db, companyId, lockKey);
    throw error;
  }
}
