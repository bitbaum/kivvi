"use server";

import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { listContacts, listProducts, listDocuments, listInventoryItems } from "@kivvi/core";
import type { DocumentType, DocumentStatus } from "@kivvi/database";
import { type ActionResult, requireRole, safeErrorMessage } from "./utils";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("csvExport");
  try {
    const { companyId } = await requireRole("member");
    const result = await listContacts(db, companyId, {
      search: filters?.search,
      type: filters?.type as "customer" | "vendor" | "both" | undefined,
      pageSize: 10000,
    });

    const headers = [
      "Contact Number",
      "Name",
      "First Name",
      "Last Name",
      "Type",
      "Email",
      "Phone",
      "Mobile",
      "Address",
      "Postal Code",
      "City",
      "Country",
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
        filename: `contacts-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExportFailed")),
    };
  }
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function exportProductsCsvAction(filters?: {
  search?: string;
}): Promise<ActionResult<CsvExportResult>> {
  const t = await getTranslations("csvExport");
  try {
    const { companyId } = await requireRole("member");
    const result = await listProducts(db, companyId, {
      ...filters,
      pageSize: 10000,
    });

    const headers = [
      "Article Number",
      "Name",
      "Type",
      "SKU",
      "Price",
      "Purchase Price",
      "VAT",
      "Unit",
      "Stock",
      "Min Stock",
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
        filename: `products-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExportFailed")),
    };
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
  const t = await getTranslations("csvExport");
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
      "Number",
      "Type",
      "Status",
      "Contact",
      "Date",
      "Due",
      "Net",
      "VAT",
      "Total",
      "Currency",
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
    const typeLabel = filters?.type || "documents";
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `${typeLabel}-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExportFailed")),
    };
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
  warehouseId?: string;
}): Promise<ActionResult<CsvExportResult>> {
  const t = await getTranslations("csvExport");
  try {
    const { companyId } = await requireRole("member");
    const result = await listInventoryItems(db, companyId, {
      ...filters,
      pageSize: 10000,
    });

    const headers = [
      "Item Number",
      "Description",
      "Category",
      "Condition",
      "Status",
      "Product",
      "Warehouse",
      "Location",
      "Donor",
      "Assigned To",
      "Estimated Value",
      "Asking Price",
      "Min Price",
      "Sold Price",
      "Labour Cost",
      "Parts Cost",
      "Effective Cost",
      "Repair Hours",
      "Serial Number",
      "Data Erasure Date",
      "Data Erasure Method",
      "Created At",
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
      item.partsTotal && new Decimal(item.partsTotal).gt(0) ? item.partsTotal : null,
      item.effectiveCost,
      item.repairHours,
      item.serialNumber,
      item.dataErasuredAt ? formatDateCsv(item.dataErasuredAt) : null,
      item.dataErasureMethod,
      formatDateCsv(item.createdAt),
    ]);

    const date = new Date().toISOString().split("T")[0];
    return {
      success: true,
      data: {
        csvData: buildCsv(headers, rows),
        filename: `inventory-${date}.csv`,
        rowCount: rows.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorExportFailed")),
    };
  }
}
