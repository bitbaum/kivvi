import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import {
  getImpactMetrics,
  getMonthlyBreakdown,
  getTopDonors,
  getDestinationBreakdown,
} from "@kivvi/core/src/domain/impact";
import { generateImpactPdf } from "@kivvi/core/src/domain/impact-pdf";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const companyId = session.user.companyId;

    // Accept ?start=YYYY-MM-DD&end=YYYY-MM-DD (preferred) or legacy ?year=2026.
    const startParam = request.nextUrl.searchParams.get("start");
    const endParam = request.nextUrl.searchParams.get("end");
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (startParam && endParam) {
      startDate = new Date(startParam);
      endDate = new Date(`${endParam}T23:59:59`);
    } else if (year && !isNaN(year)) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: { name: true, settings: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const settings = (company.settings as CompanySettings) ?? {};
    const opts = { startDate, endDate };

    // Fetch all data in parallel
    const [metrics, monthlyBreakdown, topDonors, destinationBreakdown] =
      await Promise.all([
        getImpactMetrics(db, companyId, {
          ...opts,
          co2FactorsKg: settings.co2FactorsKg,
        }),
        getMonthlyBreakdown(db, companyId, opts),
        getTopDonors(db, companyId, {
          ...opts,
          limit: 5,
          anonymize: request.nextUrl.searchParams.get("anonymize") === "1",
        }),
        getDestinationBreakdown(db, companyId, opts),
      ]);

    // Fetch previous year metrics for comparison (only when a specific calendar year is selected)
    let previousYearMetrics = undefined;
    let previousYear = undefined;
    if (year && !isNaN(year)) {
      const prevStart = new Date(year - 1, 0, 1);
      const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59);
      previousYearMetrics = await getImpactMetrics(db, companyId, {
        startDate: prevStart,
        endDate: prevEnd,
        co2FactorsKg: settings.co2FactorsKg,
      });
      previousYear = String(year - 1);
    }

    const yearLabel =
      startParam && endParam
        ? `${startParam}–${endParam}`
        : year
          ? String(year)
          : "Gesamt";
    const pdf = await generateImpactPdf({
      companyName: company.name,
      year: yearLabel,
      generatedAt: new Date().toISOString(),
      metrics,
      monthlyBreakdown,
      topDonors,
      destinationBreakdown,
      previousYearMetrics,
      previousYear,
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
