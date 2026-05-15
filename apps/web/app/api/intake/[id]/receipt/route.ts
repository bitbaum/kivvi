import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDocument } from "@kivvi/core";
import { generateDonationReceiptPdf } from "@kivvi/core/src/domain/pdf-generation";
import { contacts, documentItems } from "@kivvi/database";
import { and, eq } from "drizzle-orm";
import { getCompany } from "@kivvi/core/src/domain/companies";
import Decimal from "decimal.js";
import { logger } from "@/lib/logger";
import {
  DEFAULT_LOCALE,
  DEFAULT_CURRENCY,
} from "@kivvi/core/src/config/locale";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const companyId = session.user.companyId;

    // Fetch document
    const doc = await getDocument(db, companyId, id);
    if (!doc || doc.type !== "intake") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (doc.intakeSource !== "donation") {
      return NextResponse.json(
        { error: "Receipt only available for donation intakes" },
        { status: 400 },
      );
    }

    if (doc.status === "draft") {
      return NextResponse.json(
        { error: "Confirm the intake before generating receipt" },
        { status: 400 },
      );
    }

    // Fetch company info
    const company = await getCompany(db, companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 500 });
    }

    const settings = company.settings || {};

    // Fetch donor contact
    const donorId = doc.donorId || doc.contactId;
    let donor: {
      name: string;
      address?: string | null;
      city?: string | null;
      postalCode?: string | null;
    } | null = null;
    if (donorId) {
      const [c] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, donorId), eq(contacts.companyId, companyId)))
        .limit(1);
      if (c) donor = c;
    }

    // Fetch items — documentId is already validated to belong to companyId above
    const items = await db
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, id));

    // Calculate estimated total using Decimal (never float arithmetic on money)
    let estimatedTotal: string | undefined;
    const total = items.reduce(
      (sum, item) =>
        sum.plus(
          new Decimal(item.unitPrice || "0").times(item.quantity || "1"),
        ),
      new Decimal(0),
    );
    if (total.gt(0)) estimatedTotal = total.toFixed(2);

    // Format date
    const date = doc.issueDate
      ? new Date(doc.issueDate).toLocaleDateString(DEFAULT_LOCALE)
      : new Date().toLocaleDateString(DEFAULT_LOCALE);

    // Generate PDF
    const pdfBuffer = await generateDonationReceiptPdf({
      companyName: company.name,
      companyAddress: company.address || "",
      companyCity: company.city || "",
      companyPostalCode: company.postalCode || "",
      companyLogoBase64: settings.logoBase64,
      donorName: donor?.name || "Unbekannt",
      donorAddress: donor?.address || undefined,
      donorCity: donor?.city || undefined,
      donorPostalCode: donor?.postalCode || undefined,
      number: doc.number,
      date,
      items: items.map((item) => ({
        description: item.description || "",
        quantity: item.quantity || "1",
      })),
      estimatedTotalValue: estimatedTotal,
      currency: doc.currency || DEFAULT_CURRENCY,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Spendenquittung-${doc.number}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Receipt generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 },
    );
  }
}
