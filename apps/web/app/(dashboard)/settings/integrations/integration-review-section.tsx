"use client";

import { useTransition } from "react";
import { FileText, Mail, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  createContactFromIntegrationItemAction,
  ignoreExternalIntegrationItemAction,
} from "@/app/actions/integrations";

interface IntegrationReviewItem {
  id: string;
  source: "mail" | "nextcloud";
  kind: "email" | "file";
  status: "new" | "reviewed" | "converted" | "ignored";
  title: string;
  summary: string | null;
  fromName: string | null;
  fromEmail: string | null;
  occurredAt: Date | null;
  url: string | null;
}

export function IntegrationReviewSection({
  items,
}: {
  items: IntegrationReviewItem[];
}) {
  const t = useTranslations("settings.integrations.review");
  const [isPending, startTransition] = useTransition();

  function ignore(id: string) {
    startTransition(async () => {
      await ignoreExternalIntegrationItemAction(id);
    });
  }

  function createContact(id: string) {
    startTransition(async () => {
      await createContactFromIntegrationItemAction(id);
    });
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold">{t("title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {t("count", { count: items.length })}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="mt-4 divide-y rounded-lg border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <div className="mt-0.5 rounded-md bg-muted p-2">
                  {item.kind === "email" ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.source === "mail" ? t("mail") : t("nextcloud")}
                    {item.fromEmail
                      ? ` · ${item.fromName || item.fromEmail}`
                      : ""}
                    {item.occurredAt
                      ? ` · ${new Date(item.occurredAt).toLocaleDateString()}`
                      : ""}
                  </div>
                  {item.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs underline"
                    >
                      {t("openFile")}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {item.kind === "email" && item.fromEmail && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => createContact(item.id)}
                    disabled={isPending}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t("createContact")}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => ignore(item.id)}
                  disabled={isPending}
                >
                  <X className="h-4 w-4" />
                  {t("ignore")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
