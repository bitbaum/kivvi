"use server";

import { db } from "@/lib/db";
import {
  listContacts,
  listProducts,
  listDocuments,
  listInventoryItems,
} from "@kivvi/core";
import type { DocumentType, DocumentStatus } from "@kivvi/database";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { buildCsv, formatDateCsv } from "@/lib/csv-utils";

interface CsvExportResult {
  csvData: string;
  filename: string;
  rowCount: number;
}

// ============================================================================
// CONTACTS
// ============================================================================

export async function exportContactsCsvAction(filters?: {
  search?: string;
  type?: string;
}): Promise<ActionResult<CsvExportResult>> {
  try {
    const { companyId } = await requireRole("member");
    const result = await listContacts(db, companyId, {
      search: filters?.search,
      type: filters?.type as "customer" | "vendor" | "both" | undefined,
      pageSize: 10000,
    });

    const headers = [
      "Kontaktnummer",
      "Name",
      "Vorname",
      "Nachname",
      "Typ",
      "E-Mail",
      "Telefon",
      "Mobil",
      "Adresse",
      "PLZ",
      "Ort",
      "Land",
    ];

    const rows = result.data.map((c) => [
      c.contactNumber,
      c.name,
      c.firstName,
      c.lastName,
      c.type,
      c.email,
      c.phone,
      c.mobile,
      c.address,
      c.postalCode,
      c.city,
      c.country,
    ]);

    const date = new Date().toISOString().split("T")[0];
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `kontakte-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Export failed") };
  }
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function exportProductsCsvAction(filters?: {
  search?: string;
}): Promise<ActionResult<CsvExportResult>> {
  try {
    const { companyId } = await requireRole("member");
    const result = await listProducts(db, companyId, {
      ...filters,
      pageSize: 10000,
    });

    const headers = [
      "Artikelnummer",
      "Name",
      "Typ",
      "SKU",
      "Preis",
      "Einkaufspreis",
      "MWST",
      "Einheit",
      "Lagerbestand",
      "Mindestbestand",
    ];

    const rows = result.data.map((p) => [
      p.articleNumber,
      p.name,
      p.type,
      p.sku,
      p.unitPrice,
      p.purchasePrice,
      p.vatRate,
      p.unit,
      p.stockQuantity,
      p.minStock,
    ]);

    const date = new Date().toISOString().split("T")[0];
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `produkte-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Export failed") };
  }
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function exportDocumentsCsvAction(filters?: {
  type?: string;
  status?: string;
  search?: string;
}): Promise<ActionResult<CsvExportResult>> {
  try {
    const { companyId } = await requireRole("member");
    const result = await listDocuments(db, companyId, {
      type: filters?.type as DocumentType | undefined,
      status: filters?.status as DocumentStatus | undefined,
      search: filters?.search,
      pageSize: 10000,
      sortBy: "issueDate",
      sortOrder: "desc",
    });

    const headers = [
      "Nummer",
      "Typ",
      "Status",
      "Kontakt",
      "Datum",
      "Fällig",
      "Netto",
      "MWST",
      "Total",
      "Währung",
    ];

    const rows = result.data.map((d) => [
      d.number,
      d.type,
      d.status,
      d.contact?.name,
      formatDateCsv(d.issueDate),
      formatDateCsv(d.dueDate),
      d.subtotal,
      d.vatAmount,
      d.total,
      d.currency,
    ]);

    const date = new Date().toISOString().split("T")[0];
    const typeLabel = filters?.type || "dokumente";
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `${typeLabel}-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Export failed") };
  }
}

// ============================================================================
// INVENTORY ITEMS
// ============================================================================

export async function exportInventoryItemsCsvAction(filters?: {
  status?: string;
  condition?: string;
  search?: string;
  assignedToUserId?: string;
}): Promise<ActionResult<CsvExportResult>> {
  try {
    const { companyId } = await requireRole("member");
    const result = await listInventoryItems(db, companyId, {
      ...filters,
      pageSize: 10000,
    });

    const headers = [
      "Artikelnummer",
      "Beschreibung",
      "Kategorie",
      "Zustand",
      "Status",
      "Produkt",
      "Lager",
      "Standort",
      "Spender",
      "Zugewiesen an",
      "Schätzwert",
      "Verkaufspreis",
      "Mindestpreis",
      "Verkauft für",
      "Reparaturkosten",
      "Reparaturstunden",
      "Seriennummer",
      "Erfasst am",
    ];

    const rows = result.data.map((item) => [
      item.itemNumber,
      item.description,
      item.category,
      item.condition,
      item.status,
      item.productName,
      item.warehouseName,
      item.location,
      item.donorName,
      item.assignedToName,
      item.estimatedValue,
      item.askingPrice,
      item.minPrice,
      item.soldPrice,
      item.repairCost,
      item.repairHours,
      item.serialNumber,
      formatDateCsv(item.createdAt),
    ]);

    const date = new Date().toISOString().split("T")[0];
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `inventar-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, "Export failed") };
  }
}
