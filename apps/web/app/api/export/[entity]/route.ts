import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Papa from "papaparse";
import {
  listContacts,
  listProducts,
  listDocuments,
  listJournalEntries,
} from "@kivvi/core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const session = await auth();
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entity } = await params;
  const { searchParams } = new URL(request.url);
  const companyId = session.user.companyId;

  let csvData: string;
  let filename: string;

  switch (entity) {
    case "contacts": {
      const result = await listContacts(db, companyId, { pageSize: 10000 });
      const rows = result.data.map((c) => ({
        "Contact Number": c.contactNumber || "",
        Name: c.name,
        "First Name": c.firstName || "",
        "Last Name": c.lastName || "",
        Type: c.type,
        Email: c.email || "",
        Phone: c.phone || "",
        Mobile: c.mobile || "",
        Website: c.website || "",
        Address: c.address || "",
        "Postal Code": c.postalCode || "",
        City: c.city || "",
        Country: c.country || "",
        "VAT Number": c.vatNumber || "",
        IBAN: c.iban || "",
        BIC: c.bic || "",
        "Payment Terms (Days)": c.paymentTermsDays ?? "",
        Language: c.language || "",
      }));
      csvData = Papa.unparse(rows);
      filename = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "products": {
      const result = await listProducts(db, companyId, { pageSize: 10000 });
      const rows = result.data.map((p) => ({
        "Article Number": p.articleNumber || "",
        Name: p.name,
        Description: p.description || "",
        Type: p.type,
        SKU: p.sku || "",
        EAN: p.ean || "",
        Price: p.unitPrice,
        "Purchase Price": p.purchasePrice || "",
        "VAT Rate": p.vatRate,
        Unit: p.unit || "",
        Stock: p.stockQuantity || "",
        "Min Stock": p.minStock ?? "",
        Currency: p.currency || "CHF",
      }));
      csvData = Papa.unparse(rows);
      filename = `products-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "invoices": {
      const type = searchParams.get("type") || "invoice";
      const result = await listDocuments(db, companyId, {
        type: type as any,
        pageSize: 10000,
      });
      const rows = result.data.map((d) => ({
        Number: d.number,
        Status: d.status,
        Date: d.issueDate
          ? new Date(d.issueDate).toISOString().split("T")[0]
          : "",
        "Due Date": d.dueDate
          ? new Date(d.dueDate).toISOString().split("T")[0]
          : "",
        Contact: d.contact?.name || "",
        Subtotal: d.subtotal,
        VAT: d.vatAmount,
        Total: d.total,
        Currency: d.currency,
      }));
      csvData = Papa.unparse(rows);
      const typeNames: Record<string, string> = {
        invoice: "invoices",
        quote: "quotes",
        order: "orders",
        credit_note: "credit-notes",
        delivery_note: "delivery-notes",
        purchase_order: "purchase-orders",
        purchase_invoice: "purchase-invoices",
      };
      filename = `${typeNames[type] || type}-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "journal": {
      const result = await listJournalEntries(db, companyId, {
        pageSize: 10000,
      });
      const rows = result.data.map((e) => ({
        Date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
        Reference: e.reference || "",
        Description: e.description || "",
        Type: e.sourceType || "manual",
      }));
      csvData = Papa.unparse(rows);
      filename = `journal-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  }

  // Add BOM for Excel compatibility with UTF-8
  const bom = "\uFEFF";
  return new Response(bom + csvData, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
