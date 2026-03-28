"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { duplicateDocumentAction } from "@/app/actions/documents";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";
import type { DocumentType } from "@kivvi/database";

export function DocumentDuplicateButton({
  documentId,
  documentType,
}: {
  documentId: string;
  documentType: DocumentType;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("documents");

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateDocumentAction(documentId);
      if (result.success && result.data) {
        const config = DOCUMENT_TYPES[result.data.type as DocumentType];
        router.push(`${config.basePath}/${result.data.id}/edit`);
      }
    });
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted min-h-[44px] disabled:opacity-50"
    >
      <Copy className="h-4 w-4" />
      {isPending ? "..." : t("duplicate")}
    </button>
  );
}
