import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { getDocument } from "@kivvi/core";
import { generateDeliveryNotePdf } from "@kivvi/core/src/domain/pdf-generation";
import { buildInvoicePdfData } from "@/lib/pdf/build-pdf-data";
import { eq } from "drizzle-orm";

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

    const doc = await getDocument(db, companyId, id);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (doc.type !== "delivery_note") {
      return NextResponse.json(
        { error: "Document is not a delivery note" },
        { status: 400 },
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const pdfData = buildInvoicePdfData(doc, {
      ...company,
      settings: (company.settings as CompanySettings) ?? {},
    });

    const pdf = await generateDeliveryNotePdf({
      companyName: pdfData.companyName,
      companyAddress: pdfData.companyAddress,
      companyCity: pdfData.companyCity,
      companyPostalCode: pdfData.companyPostalCode,
      companyCountry: pdfData.companyCountry,
      companyVatNumber: pdfData.companyVatNumber,
      companyLogoBase64: pdfData.companyLogoBase64,
      number: pdfData.number,
      issueDate: pdfData.issueDate,
      contactName: pdfData.contactName,
      contactAddress: pdfData.contactAddress,
      contactCity: pdfData.contactCity,
      contactPostalCode: pdfData.contactPostalCode,
      contactCountry: pdfData.contactCountry,
      items: pdfData.items.map((item) => ({
        position: item.position,
        description: item.description,
        quantity: item.quantity,
      })),
      notes: pdfData.notes,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
