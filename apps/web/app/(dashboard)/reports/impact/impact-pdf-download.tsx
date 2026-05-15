"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ImpactPdfDownload() {
  const tr = useTranslations("reports");
  const searchParams = useSearchParams();
  const [anonymize, setAnonymize] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const start = searchParams.get("start");
      const end = searchParams.get("end");
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      if (anonymize) params.set("anonymize", "1");
      const url = `/api/reports/impact-pdf?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(tr("impactPdfError"));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "impact-report.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={anonymize}
          onChange={(e) => setAnonymize(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        {tr("impactAnonymizeDonors")}
      </label>
      <Button
        variant="secondary"
        onClick={handleDownload}
        disabled={loading}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {loading ? tr("impactGeneratingPdf") : tr("impactDownloadPdf")}
      </Button>
    </div>
  );
}
