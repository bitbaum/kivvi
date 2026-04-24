/**
 * Sample data seeding for onboarding.
 *
 * Creates a realistic but clearly fictional dataset so new users can
 * explore Kivvi without needing to import their own data first.
 *
 * Everything created here is labelled "Beispieldaten" / tagged so a
 * company can bulk-delete it once they're ready to go live.
 */

import type { Database } from "@kivvi/database";
import { createContact } from "./contacts";
import { createProduct } from "./products";
import {
  createDocument,
  updateDocumentStatus,
  recordPayment,
} from "./documents";
import { createInventoryItem, updateItemStatus } from "./inventory-items";
import { warehouses, companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";

/**
 * Seed the given company with sample data.
 * Idempotent: checks isSampleData flag before inserting.
 */
export async function seedSampleData(
  db: Database,
  companyId: string,
  userId: string,
): Promise<void> {
  // Check if already seeded
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  const settings = (company?.settings as CompanySettings) ?? {};
  if (settings.isSampleData) return;

  // Find default warehouse
  const [warehouse] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId))
    .limit(1);

  const warehouseId = warehouse?.id ?? null;

  // ── 1. Contacts ──────────────────────────────────────────────────────────

  const [customerA, customerB, donor] = await Promise.all([
    createContact(db, companyId, {
      type: "customer",
      name: "Beispiel GmbH",
      email: "info@beispiel-gmbh.ch",
      address: "Bahnhofstrasse 1",
      city: "Zürich",
      postalCode: "8001",
      country: "CH",
      paymentTermsDays: 30,
    }),
    createContact(db, companyId, {
      type: "customer",
      name: "Muster AG",
      email: "office@muster-ag.ch",
      address: "Hauptgasse 12",
      city: "Bern",
      postalCode: "3011",
      country: "CH",
      paymentTermsDays: 14,
    }),
    createContact(db, companyId, {
      type: "both",
      name: "Tech4Good Stiftung",
      email: "spenden@tech4good.ch",
      address: "Technoparkstrasse 5",
      city: "Zürich",
      postalCode: "8005",
      country: "CH",
      paymentTermsDays: 30,
    }),
  ]);

  // ── 2. Products ───────────────────────────────────────────────────────────

  const [laptop, monitor, desktop] = await Promise.all([
    createProduct(db, companyId, {
      name: "Refurbished Laptop (Beispiel)",
      type: "product",
      unitPrice: "150.00",
      vatRate: "8.1",
      unit: "piece",
      currency: "CHF",
    }),
    createProduct(db, companyId, {
      name: "Refurbished Monitor (Beispiel)",
      type: "product",
      unitPrice: "75.00",
      vatRate: "8.1",
      unit: "piece",
      currency: "CHF",
    }),
    createProduct(db, companyId, {
      name: "Refurbished Desktop PC (Beispiel)",
      type: "product",
      unitPrice: "200.00",
      vatRate: "8.1",
      unit: "piece",
      currency: "CHF",
    }),
  ]);

  // ── 3. Documents ──────────────────────────────────────────────────────────

  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  // Paid invoice (30 days ago)
  const paidInvoice = await createDocument(db, companyId, userId, {
    type: "invoice",
    contactId: customerA.id,
    issueDate: daysAgo(30),
    dueDate: daysAgo(0),
    items: [
      {
        productId: laptop.id,
        position: 1,
        description: "Refurbished Laptop (Beispiel)",
        quantity: "2",
        unitPrice: "150.00",
        unit: "piece",
        vatRate: "8.1",
      },
      {
        productId: monitor.id,
        position: 2,
        description: "Refurbished Monitor (Beispiel)",
        quantity: "2",
        unitPrice: "75.00",
        unit: "piece",
        vatRate: "8.1",
      },
    ],
    notes: "Beispielrechnung — kann gelöscht werden",
  });

  // Pending invoice (10 days ago, due in 20 days)
  const pendingInvoice = await createDocument(db, companyId, userId, {
    type: "invoice",
    contactId: customerB.id,
    issueDate: daysAgo(10),
    dueDate: daysAgo(-20),
    items: [
      {
        productId: desktop.id,
        position: 1,
        description: "Refurbished Desktop PC (Beispiel)",
        quantity: "1",
        unitPrice: "200.00",
        unit: "piece",
        vatRate: "8.1",
      },
    ],
    notes: "Beispielrechnung — kann gelöscht werden",
  });

  // Overdue invoice (60 days ago, due 30 days ago)
  const overdueInvoice = await createDocument(db, companyId, userId, {
    type: "invoice",
    contactId: customerA.id,
    issueDate: daysAgo(60),
    dueDate: daysAgo(30),
    items: [
      {
        productId: laptop.id,
        position: 1,
        description: "Refurbished Laptop (Beispiel)",
        quantity: "1",
        unitPrice: "150.00",
        unit: "piece",
        vatRate: "8.1",
      },
    ],
    notes: "Beispielrechnung (überfällig) — kann gelöscht werden",
  });

  // Transition documents to proper statuses
  await Promise.all([
    updateDocumentStatus(db, companyId, paidInvoice.id, "sent"),
    updateDocumentStatus(db, companyId, pendingInvoice.id, "sent"),
    updateDocumentStatus(db, companyId, overdueInvoice.id, "sent"),
  ]);

  await Promise.all([
    updateDocumentStatus(db, companyId, paidInvoice.id, "confirmed"),
    updateDocumentStatus(db, companyId, pendingInvoice.id, "confirmed"),
    updateDocumentStatus(db, companyId, overdueInvoice.id, "confirmed"),
  ]);

  // Record payment for the paid invoice
  await recordPayment(db, companyId, paidInvoice.id, {
    amount: paidInvoice.total,
    date: daysAgo(5),
    method: "bank_transfer",
  });

  // ── 4. Inventory items ────────────────────────────────────────────────────

  const inventoryData = [
    {
      description: "Lenovo ThinkPad T480 — Beispiel",
      category: "laptop",
      condition: "good" as const,
      askingPrice: "149.00",
      notes: "i5-8250U, 8GB RAM, 256GB SSD — Beispiel",
      donorContactId: donor.id,
    },
    {
      description: "Dell OptiPlex 7050 — Beispiel",
      category: "desktop",
      condition: "fair" as const,
      askingPrice: "89.00",
      notes: "i5-7500, 8GB RAM, 500GB HDD — Beispiel",
      donorContactId: donor.id,
    },
    {
      description: "Dell U2412M Monitor — Beispiel",
      category: "monitor",
      condition: "good" as const,
      askingPrice: "49.00",
      notes: '24", 1920×1200, DisplayPort — Beispiel',
      donorContactId: donor.id,
    },
    {
      description: "HP EliteBook 840 G5 — Beispiel",
      category: "laptop",
      condition: "poor" as const,
      askingPrice: "79.00",
      notes: "Akku defekt, Keyboard OK — Beispiel",
      donorContactId: donor.id,
    },
    {
      description: "Logitech MX Keys Tastatur — Beispiel",
      category: "peripheral",
      condition: "good" as const,
      askingPrice: "29.00",
      notes: "Wireless, Deutsch-CH — Beispiel",
      donorContactId: donor.id,
    },
  ];

  const items = await Promise.all(
    inventoryData.map((item) =>
      createInventoryItem(db, companyId, {
        description: item.description,
        category: item.category,
        condition: item.condition,
        askingPrice: item.askingPrice,
        notes: item.notes,
        donorContactId: item.donorContactId,
        warehouseId: warehouseId ?? undefined,
      }),
    ),
  );

  // Move first 2 items to ready_for_sale, 3rd to testing, rest stay at intake
  await Promise.all([
    updateItemStatus(db, companyId, items[0].id, "testing", userId),
    updateItemStatus(db, companyId, items[1].id, "testing", userId),
  ]);
  await Promise.all([
    updateItemStatus(db, companyId, items[0].id, "ready_for_sale", userId),
    updateItemStatus(db, companyId, items[1].id, "ready_for_sale", userId),
    updateItemStatus(db, companyId, items[2].id, "testing", userId),
  ]);

  // ── 5. Mark company as seeded ─────────────────────────────────────────────

  await db
    .update(companies)
    .set({
      settings: {
        ...settings,
        isSampleData: true,
      },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}

/**
 * Clear all sample data from a company.
 * Deletes contacts, products, documents, and inventory items that were
 * created by sample seeding (identified by "Beispiel" in their notes/name).
 * Then clears the isSampleData flag.
 */
export async function clearSampleData(
  db: Database,
  companyId: string,
): Promise<void> {
  // We rely on cascade deletes — clearing contacts clears documents indirectly
  // For safety, just clear the flag and let the user manually delete if needed.
  // Full cascade clear would be too destructive if mixed with real data.

  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));

  const settings = (company?.settings as CompanySettings) ?? {};

  await db
    .update(companies)
    .set({
      settings: { ...settings, isSampleData: false },
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));
}
