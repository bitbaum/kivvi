"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

export function PrintButton({ documentId }: { documentId: string }) {
  const tc = useTranslations("common");

  function handlePrint() {
    const url = `/api/documents/${documentId}/pdf`;
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  }

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
    >
      <Printer className="h-4 w-4" />
      {tc("print")}
    </button>
  );
}
