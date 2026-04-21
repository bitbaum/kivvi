"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "Gesamtzeitraum" },
  ...Array.from({ length: 5 }, (_, i) => {
    const y = CURRENT_YEAR - i;
    return { value: String(y), label: String(y) };
  }),
];

export function ImpactPdfDownload() {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const url = year
        ? `/api/reports/impact-pdf?year=${year}`
        : "/api/reports/impact-pdf";
      const res = await fetch(url);
      if (!res.ok) throw new Error("PDF-Generierung fehlgeschlagen");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "wirkungsbericht.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Berichtsjahr"
      >
        {YEAR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        onClick={handleDownload}
        disabled={loading}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {loading ? "Wird erstellt…" : "PDF herunterladen"}
      </Button>
    </div>
  );
}
