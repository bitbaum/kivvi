import Link from "next/link";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_STYLES, toCamelCase } from "@/lib/config/document-types";
import { CardSection } from "@/components/card-section";
import { StatusBadge } from "@/components/status-badge";
import type { getContact } from "@kivvi/core";

type RecentDocument = NonNullable<
  Awaited<ReturnType<typeof getContact>>
>["recentDocuments"][number];

interface ContactRecentDocumentsProps {
  contactId: string;
  documents: RecentDocument[];
}

export async function ContactRecentDocuments({
  contactId,
  documents,
}: ContactRecentDocumentsProps) {
  const t = await getTranslations("contacts");
  const tc = await getTranslations("common");
  const td = await getTranslations("documents");
  const ts = await getTranslations("status");

  return (
    <CardSection
      title={t("recentDocuments")}
      icon={<FileText className="h-4 w-4" />}
      actions={
        <Link
          href={`/documents?contactId=${contactId}`}
          className="text-sm text-primary hover:underline"
        >
          {tc("viewAll")}
        </Link>
      }
      noPadding
    >
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{t("noDocuments")}</p>
        </div>
      ) : (
        <div className="divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium">{doc.number}</p>
                <p className="text-xs text-muted-foreground">
                  {td(toCamelCase(doc.type))} &middot; {formatDate(doc.issueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{formatCurrency(doc.total)}</p>
                <StatusBadge
                  status={doc.status}
                  label={ts(toCamelCase(doc.status))}
                  styleMap={STATUS_STYLES}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardSection>
  );
}
