import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getCompany } from "@kivvi/core/src/domain/companies";
import { getInventoryItem } from "@kivvi/core/src/domain/inventory-items";
import { DATA_ERASURE_METHODS } from "@kivvi/core/src/config/checklist-templates";
import {
  generateErasureCertificate,
  buildCertificateNumber,
} from "@kivvi/core/src/domain/erasure-certificate";
import { isValidUUID } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    if (!isValidUUID(params.id)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const item = await getInventoryItem(db, companyId, params.id);
    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 },
      );
    }

    if (!item.dataErasuredAt || !item.dataErasureMethod) {
      return NextResponse.json(
        { error: "No data erasure recorded for this item" },
        { status: 422 },
      );
    }

    // Fetch company info and erasing user in parallel
    const [company, erasedByUser] = await Promise.all([
      getCompany(db, companyId),
      item.dataErasuredByUserId
        ? db.query.users.findFirst({
            where: eq(users.id, item.dataErasuredByUserId),
            columns: { name: true },
          })
        : Promise.resolve(null),
    ]);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const certificateNumber = buildCertificateNumber(
      item.itemNumber,
      item.dataErasuredAt,
    );

    const pdf = await generateErasureCertificate({
      companyName: company.name,
      companyAddress: company.address ?? undefined,
      companyCity: company.city ?? undefined,
      itemNumber: item.itemNumber,
      description: item.description,
      serialNumber: item.serialNumber,
      category: item.category,
      dataErasureMethod: item.dataErasureMethod,
      erasureMethodLabel:
        DATA_ERASURE_METHODS[item.dataErasureMethod] ?? item.dataErasureMethod,
      dataErasuredAt: item.dataErasuredAt,
      erasedByName: erasedByUser?.name ?? null,
      certificateNumber,
      generatedAt: new Date(),
    });

    const filename = `datenloesch-zertifikat-${item.itemNumber.toLowerCase()}.pdf`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
