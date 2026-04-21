import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";
import { generateImpactPdf } from "@kivvi/core/src/domain/impact-pdf";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    // Optional ?year=2026 filter. Omit for all-time.
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (year && !isNaN(year)) {
      startDate = new Date(year, 0, 1); // Jan 1
      endDate = new Date(year, 11, 31, 23, 59, 59); // Dec 31
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { name: true, settings: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const settings = (company.settings as CompanySettings) ?? {};
    const metrics = await getImpactMetrics(db, companyId, {
      startDate,
      endDate,
      co2FactorsKg: settings.co2FactorsKg,
    });

    const yearLabel = year ? String(year) : "Gesamt";
    const pdf = await generateImpactPdf({
      companyName: company.name,
      year: yearLabel,
      generatedAt: new Date().toISOString(),
      metrics,
    });

    const filename = `wirkungsbericht-${yearLabel.toLowerCase()}-${company.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;

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
