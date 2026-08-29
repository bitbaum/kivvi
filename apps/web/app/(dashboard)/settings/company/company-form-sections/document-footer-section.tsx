"use client";

import { useTranslations } from "next-intl";

interface Props {
  defaultDocumentFooter: string;
}

export function DocumentFooterSection({ defaultDocumentFooter }: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.documentFooter")}</h2>
      </div>
      <div className="p-6">
        <label htmlFor="defaultDocumentFooter" className="mb-1.5 block text-sm font-medium">
          {t("company.defaultDocumentFooter")}
        </label>
        <textarea
          id="defaultDocumentFooter"
          name="defaultDocumentFooter"
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t("company.placeholders.documentFooter")}
          defaultValue={defaultDocumentFooter}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("company.defaultDocumentFooterHint")}
        </p>
      </div>
    </section>
  );
}
