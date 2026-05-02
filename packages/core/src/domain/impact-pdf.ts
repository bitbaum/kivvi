/**
 * Impact report PDF generation.
 *
 * Produces a single-page, print-ready PDF suitable for:
 * - Vereinsberichte (annual nonprofit reports)
 * - Grant applications
 * - Donor communications
 *
 * Uses PDFKit — same library as invoice PDF generation.
 */

import PDFDocument from "pdfkit";
import type {
  ImpactMetrics,
  MonthlyBreakdown,
  TopDonor,
  DestinationBreakdown,
} from "./impact";
import { CO2_TREE_KG_PER_YEAR, CO2_CAR_KG_PER_KM } from "../config/co2-factors";
import { DEFAULT_LOCALE } from "../config/locale";

export interface ImpactPdfData {
  companyName: string;
  year: string; // "2026" or "Gesamt" for all-time
  generatedAt: string; // ISO date string
  metrics: ImpactMetrics;
  monthlyBreakdown?: MonthlyBreakdown[];
  topDonors?: TopDonor[];
  destinationBreakdown?: DestinationBreakdown;
  /** Previous year metrics for comparison — shown only when available */
  previousYearMetrics?: ImpactMetrics;
  previousYear?: string;
}

/**
 * Generate an impact report PDF buffer.
 * Returns a Buffer containing the complete PDF.
 */
export function generateImpactPdf(data: ImpactPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      info: {
        Title: `Wirkungsbericht ${data.year} — ${data.companyName}`,
        Author: data.companyName,
        Creator: "Kivvi ERP",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width - 112; // usable width (margins both sides)
    const GREEN = "#16a34a";
    const MUTED = "#6b7280";
    const BORDER = "#e5e7eb";
    const BG_GREEN = "#f0fdf4";

    // ── Header ─────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .fillColor("#111827")
      .font("Helvetica-Bold")
      .text("Wirkungsbericht", { continued: true })
      .fillColor(GREEN)
      .text(` ${data.year}`);

    doc
      .moveDown(0.3)
      .fontSize(12)
      .fillColor(MUTED)
      .font("Helvetica")
      .text(data.companyName);

    // Divider
    doc
      .moveDown(0.8)
      .moveTo(56, doc.y)
      .lineTo(56 + PAGE_W, doc.y)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke()
      .moveDown(0.8);

    // ── KPI Grid (2×2) ──────────────────────────────────────────────────────
    const { metrics } = data;
    const co2Kg = Number(metrics.co2AvoidedKg);
    const co2Tonnes = (co2Kg / 1000).toFixed(2);
    const treesEquiv = Math.round(co2Kg / CO2_TREE_KG_PER_YEAR);
    const carKmEquiv = Math.round(co2Kg / CO2_CAR_KG_PER_KM);

    const kpis = [
      {
        value: metrics.itemsReused.toLocaleString(DEFAULT_LOCALE),
        label: "Artikel wiederverwendet",
        sub: `${metrics.reuseRatePercent}% Wiederverwendungsrate`,
      },
      {
        value: `${co2Tonnes} t`,
        label: "CO₂ vermieden",
        sub: `${co2Kg.toLocaleString(DEFAULT_LOCALE)} kg gesamt`,
      },
      {
        value: metrics.wasteDiverted.toLocaleString(DEFAULT_LOCALE),
        label: "Artikel aus Abfall gerettet",
        sub: `inkl. ${metrics.itemsRecycled} recycelt`,
      },
      {
        value: metrics.itemsProcessed.toLocaleString(DEFAULT_LOCALE),
        label: "Artikel verarbeitet",
        sub: "seit Betriebsbeginn",
      },
    ];

    const kpiW = (PAGE_W - 12) / 2;
    const kpiH = 72;
    const kpiStartY = doc.y;

    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 56 + col * (kpiW + 12);
      const y = kpiStartY + row * (kpiH + 10);

      // Background rect
      doc.roundedRect(x, y, kpiW, kpiH, 6).fillColor(BG_GREEN).fill();

      // Value
      doc
        .fontSize(26)
        .fillColor(GREEN)
        .font("Helvetica-Bold")
        .text(kpi.value, x + 14, y + 12, { width: kpiW - 28 });

      // Label
      doc
        .fontSize(9)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text(kpi.label, x + 14, y + 44, { width: kpiW - 28 });

      // Sub
      doc
        .fontSize(8)
        .fillColor(MUTED)
        .font("Helvetica")
        .text(kpi.sub, x + 14, y + 56, { width: kpiW - 28 });
    });

    doc.y = kpiStartY + 2 * (kpiH + 10) + 10;

    // ── CO₂ Equivalents ────────────────────────────────────────────────────
    if (co2Kg > 0) {
      doc
        .moveDown(0.5)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("CO₂-Einsparung in Kontext");

      doc.moveDown(0.4);

      const equivW = (PAGE_W - 16) / 3;
      const equivStartY = doc.y;

      const equivalents = [
        {
          value: treesEquiv.toLocaleString(DEFAULT_LOCALE),
          label: "Bäume (1 Jahr CO₂-Bindung)",
        },
        {
          value: carKmEquiv.toLocaleString(DEFAULT_LOCALE),
          label: "Autokilometer vermieden",
        },
        { value: `${co2Tonnes} t`, label: "CO₂-Äquivalente total" },
      ];

      equivalents.forEach((eq, i) => {
        const x = 56 + i * (equivW + 8);
        const y = equivStartY;

        doc
          .roundedRect(x, y, equivW, 52, 6)
          .strokeColor(BORDER)
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(18)
          .fillColor(GREEN)
          .font("Helvetica-Bold")
          .text(eq.value, x + 10, y + 8, { width: equivW - 20 });

        doc
          .fontSize(8)
          .fillColor(MUTED)
          .font("Helvetica")
          .text(eq.label, x + 10, y + 32, { width: equivW - 20 });
      });

      doc.y = equivStartY + 62;
    }

    // ── Category Breakdown ─────────────────────────────────────────────────
    if (metrics.co2ByCategory.length > 0) {
      doc
        .moveDown(0.8)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("CO₂-Einsparung nach Kategorie");

      doc.moveDown(0.4);

      const tableStartY = doc.y;
      const colWidths = [
        PAGE_W * 0.32, // Category
        PAGE_W * 0.18, // Items
        PAGE_W * 0.18, // Factor
        PAGE_W * 0.16, // CO₂
        PAGE_W * 0.16, // Share
      ];
      const headers = [
        "Kategorie",
        "Artikel",
        "Faktor (kg)",
        "CO₂ (kg)",
        "Anteil",
      ];

      // Header row
      let xPos = 56;
      doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold");
      headers.forEach((h, i) => {
        const align = i >= 1 ? "right" : "left";
        doc.text(h, xPos, tableStartY, { width: colWidths[i], align });
        xPos += colWidths[i];
      });

      doc
        .moveTo(56, tableStartY + 14)
        .lineTo(56 + PAGE_W, tableStartY + 14)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();

      let rowY = tableStartY + 18;
      const topCategories = metrics.co2ByCategory.slice(0, 8);

      topCategories.forEach((cat) => {
        const catCo2 = Number(cat.co2TotalKg);
        const pct = co2Kg > 0 ? Math.round((catCo2 / co2Kg) * 100) : 0;
        const catLabel =
          cat.category.charAt(0).toUpperCase() + cat.category.slice(1);

        xPos = 56;
        doc.fontSize(9).fillColor("#111827").font("Helvetica");
        const row = [
          catLabel,
          cat.itemCount.toLocaleString(DEFAULT_LOCALE),
          `${cat.co2KgFactor}`,
          catCo2.toLocaleString(DEFAULT_LOCALE),
          `${pct}%`,
        ];
        row.forEach((cell, i) => {
          const align = i >= 1 ? "right" : "left";
          doc.text(cell, xPos, rowY, { width: colWidths[i], align });
          xPos += colWidths[i];
        });

        rowY += 16;
      });

      if (metrics.co2ByCategory.length > 8) {
        doc
          .fontSize(8)
          .fillColor(MUTED)
          .text(
            `… und ${metrics.co2ByCategory.length - 8} weitere Kategorien`,
            56,
            rowY,
          );
        rowY += 14;
      }

      doc.y = rowY;
    }

    // ── Year Comparison ───────────────────────────────────────────────────
    if (data.previousYearMetrics && data.previousYear) {
      const prev = data.previousYearMetrics;
      const prevCo2Kg = Number(prev.co2AvoidedKg);
      const currCo2Kg = Number(metrics.co2AvoidedKg);

      doc
        .moveDown(0.8)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("Jahresvergleich");

      doc.moveDown(0.4);

      const ycStartY = doc.y;
      const colW = (PAGE_W - 24) / 3;
      const comparisons = [
        {
          label: "Artikel wiederverwendet",
          curr: metrics.itemsReused,
          prev: prev.itemsReused,
          fmt: (n: number) => n.toLocaleString(DEFAULT_LOCALE),
        },
        {
          label: "CO₂ vermieden (kg)",
          curr: currCo2Kg,
          prev: prevCo2Kg,
          fmt: (n: number) => n.toLocaleString(DEFAULT_LOCALE),
        },
        {
          label: "Wiederverwendungsrate",
          curr: metrics.reuseRatePercent,
          prev: prev.reuseRatePercent,
          fmt: (n: number) => `${n}%`,
        },
      ];

      comparisons.forEach((c, i) => {
        const x = 56 + i * (colW + 12);
        const diff = c.curr - c.prev;
        const diffSign = diff >= 0 ? "+" : "";
        const diffColor = diff >= 0 ? GREEN : "#dc2626";

        doc.roundedRect(x, ycStartY, colW, 64, 6).fillColor(BG_GREEN).fill();

        doc
          .fontSize(8)
          .fillColor(MUTED)
          .font("Helvetica")
          .text(c.label, x + 10, ycStartY + 8, { width: colW - 20 });

        doc
          .fontSize(18)
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(c.fmt(c.curr), x + 10, ycStartY + 22, { width: colW - 20 });

        doc
          .fontSize(8)
          .fillColor(MUTED)
          .font("Helvetica")
          .text(
            `${data.previousYear}: ${c.fmt(c.prev)}`,
            x + 10,
            ycStartY + 44,
            { width: (colW - 20) * 0.6 },
          );

        doc
          .fontSize(8)
          .fillColor(diffColor)
          .font("Helvetica-Bold")
          .text(
            `${diffSign}${c.fmt(diff)}`,
            x + 10 + (colW - 20) * 0.6,
            ycStartY + 44,
            { width: (colW - 20) * 0.4, align: "right" },
          );
      });

      doc.y = ycStartY + 74;
    }

    // ── Destination Breakdown ─────────────────────────────────────────────
    if (data.destinationBreakdown) {
      const dest = data.destinationBreakdown;
      const total =
        dest.sold + dest.donated + dest.recycled + dest.inStock || 1;

      doc
        .moveDown(0.8)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("Verbleib der Artikel");

      doc.moveDown(0.4);

      const destStartY = doc.y;
      const destColW = (PAGE_W - 36) / 4;

      const destinations = [
        { label: "Verkauft", count: dest.sold, color: GREEN },
        { label: "Gespendet", count: dest.donated, color: "#2563eb" },
        { label: "Recycelt", count: dest.recycled, color: "#d97706" },
        { label: "Lagerbestand", count: dest.inStock, color: MUTED },
      ];

      destinations.forEach((d, i) => {
        const x = 56 + i * (destColW + 12);
        const pct = Math.round((d.count / total) * 100);

        doc
          .roundedRect(x, destStartY, destColW, 58, 6)
          .fillColor(BG_GREEN)
          .fill();

        doc
          .fontSize(20)
          .fillColor(d.color)
          .font("Helvetica-Bold")
          .text(
            d.count.toLocaleString(DEFAULT_LOCALE),
            x + 10,
            destStartY + 8,
            {
              width: destColW - 20,
            },
          );

        doc
          .fontSize(8)
          .fillColor("#111827")
          .font("Helvetica-Bold")
          .text(d.label, x + 10, destStartY + 36, { width: destColW - 20 });

        doc
          .fontSize(8)
          .fillColor(MUTED)
          .font("Helvetica")
          .text(`${pct}%`, x + 10, destStartY + 46, { width: destColW - 20 });
      });

      doc.y = destStartY + 68;
    }

    // ── Monthly Breakdown ─────────────────────────────────────────────────
    if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
      doc
        .moveDown(0.8)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("Monatsübersicht");

      doc.moveDown(0.4);

      const mbStartY = doc.y;
      const mbColWidths = [
        PAGE_W * 0.22,
        PAGE_W * 0.26,
        PAGE_W * 0.26,
        PAGE_W * 0.26,
      ];
      const mbHeaders = [
        "Monat",
        "Verarbeitet",
        "Wiederverwendet",
        "Wiederverwendungsrate",
      ];

      let xPos = 56;
      doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold");
      mbHeaders.forEach((h, i) => {
        const align = i >= 1 ? "right" : "left";
        doc.text(h, xPos, mbStartY, { width: mbColWidths[i], align });
        xPos += mbColWidths[i];
      });

      doc
        .moveTo(56, mbStartY + 14)
        .lineTo(56 + PAGE_W, mbStartY + 14)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();

      let rowY = mbStartY + 18;
      const months = data.monthlyBreakdown.slice(0, 12);

      months.forEach((m) => {
        const [year, month] = m.month.split("-");
        const monthLabel = new Date(
          Number(year),
          Number(month) - 1,
          1,
        ).toLocaleDateString(DEFAULT_LOCALE, {
          month: "long",
          year: "numeric",
        });

        xPos = 56;
        doc.fontSize(9).fillColor("#111827").font("Helvetica");
        const row = [
          monthLabel,
          m.processed.toLocaleString(DEFAULT_LOCALE),
          m.reused.toLocaleString(DEFAULT_LOCALE),
          `${m.reuseRatePercent}%`,
        ];
        row.forEach((cell, i) => {
          const align = i >= 1 ? "right" : "left";
          doc.text(cell, xPos, rowY, { width: mbColWidths[i], align });
          xPos += mbColWidths[i];
        });

        rowY += 16;
      });

      doc.y = rowY;
    }

    // ── Top Donors ────────────────────────────────────────────────────────
    if (data.topDonors && data.topDonors.length > 0) {
      doc
        .moveDown(0.8)
        .fontSize(11)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text("Top-Spender");

      doc.moveDown(0.4);

      const tdStartY = doc.y;
      const tdColWidths = [PAGE_W * 0.5, PAGE_W * 0.25, PAGE_W * 0.25];
      const tdHeaders = ["Spender", "Gespendete Artikel", "Wiederverwendet"];

      let xPos = 56;
      doc.fontSize(8).fillColor(MUTED).font("Helvetica-Bold");
      tdHeaders.forEach((h, i) => {
        const align = i >= 1 ? "right" : "left";
        doc.text(h, xPos, tdStartY, { width: tdColWidths[i], align });
        xPos += tdColWidths[i];
      });

      doc
        .moveTo(56, tdStartY + 14)
        .lineTo(56 + PAGE_W, tdStartY + 14)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();

      let rowY = tdStartY + 18;

      data.topDonors.forEach((donor) => {
        const reuseRate =
          donor.itemsDonated > 0
            ? Math.round((donor.itemsReused / donor.itemsDonated) * 100)
            : 0;

        xPos = 56;
        doc.fontSize(9).fillColor("#111827").font("Helvetica");
        const row = [
          donor.donorName,
          donor.itemsDonated.toLocaleString(DEFAULT_LOCALE),
          `${donor.itemsReused.toLocaleString(DEFAULT_LOCALE)} (${reuseRate}%)`,
        ];
        row.forEach((cell, i) => {
          const align = i >= 1 ? "right" : "left";
          doc.text(cell, xPos, rowY, { width: tdColWidths[i], align });
          xPos += tdColWidths[i];
        });

        rowY += 16;
      });

      doc.y = rowY;
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 44;
    doc
      .moveTo(56, footerY)
      .lineTo(56 + PAGE_W, footerY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    const generatedDate = new Date(data.generatedAt).toLocaleDateString(
      DEFAULT_LOCALE,
      { day: "2-digit", month: "2-digit", year: "numeric" },
    );

    doc
      .fontSize(8)
      .fillColor(MUTED)
      .font("Helvetica")
      .text(
        `Generiert am ${generatedDate} mit Kivvi ERP — kivvi.ch`,
        56,
        footerY + 8,
        { width: PAGE_W, align: "left" },
      );

    doc.end();
  });
}
