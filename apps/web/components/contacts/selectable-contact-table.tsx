"use client";

import { useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BulkSelectionLayout } from "@/components/bulk-selection-layout";
import {
  bulkDeleteContactsAction,
  bulkDeactivateContactsAction,
} from "@/app/actions/bulk-operations";
import { useBulkSelection, type BulkAction } from "@/hooks/use-bulk-selection";
import { SortableHeader } from "@/components/sortable-header";
import { ContactTableRow } from "./contact-table-row";
import type { ContactItem, ContactTableTranslations } from "./contact-table-types";

// Re-export for consumers that imported from this file
export type { ContactItem, ContactTableTranslations as Translations };

interface SortProps {
  field: string;
  order: "asc" | "desc";
  hrefs: Record<string, string>;
}

interface SelectableContactTableProps {
  data: ContactItem[];
  translations: ContactTableTranslations;
  sort?: SortProps;
}

export function SelectableContactTable({ data, translations, sort }: SelectableContactTableProps) {
  const tc = useTranslations("common");
  const allIds = useMemo(() => data.map((c) => c.id), [data]);

  const runBulkAction = useCallback(
    (action: BulkAction, contactIds: string[]) =>
      action === "delete"
        ? bulkDeleteContactsAction({ contactIds })
        : bulkDeactivateContactsAction({ contactIds }),
    [],
  );

  const bulk = useBulkSelection(allIds, runBulkAction);
  const { selection, isPending, executeAction } = bulk;
  const { toggle, toggleAll, isSelected, isAllSelected, isSomeSelected } = selection;

  return (
    <BulkSelectionLayout
      bulk={bulk}
      labels={translations.bulkLabels}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeAction("deactivate")}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {translations.bulkLabels.deactivate}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => executeAction("delete")}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {translations.bulkLabels.delete}
          </Button>
        </>
      }
    >
      {/* Table header — hidden on mobile */}
      <div className="hidden border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:gap-4 lg:grid-cols-[auto_1fr_2fr_auto_1.5fr_1fr_1fr_1fr_auto_auto]">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isSomeSelected;
            }}
            onChange={toggleAll}
            aria-label={tc("aria.selectAll")}
            className="h-4 w-4 rounded border-input"
          />
        </div>
        <div>
          {sort ? (
            <SortableHeader
              label={translations.columnLabels.number}
              field="contactNumber"
              currentSort={sort.field}
              currentOrder={sort.order}
              href={sort.hrefs.contactNumber}
            />
          ) : (
            translations.columnLabels.number
          )}
        </div>
        <div>
          {sort ? (
            <SortableHeader
              label={translations.columnLabels.name}
              field="name"
              currentSort={sort.field}
              currentOrder={sort.order}
              href={sort.hrefs.name}
            />
          ) : (
            translations.columnLabels.name
          )}
        </div>
        <div>{translations.columnLabels.type}</div>
        <div className="hidden lg:block">{translations.columnLabels.email}</div>
        <div className="hidden lg:block">{translations.columnLabels.phone}</div>
        <div className="hidden lg:block">
          {sort ? (
            <SortableHeader
              label={translations.columnLabels.city}
              field="city"
              currentSort={sort.field}
              currentOrder={sort.order}
              href={sort.hrefs.city}
            />
          ) : (
            translations.columnLabels.city
          )}
        </div>
        <div className="hidden lg:block">{translations.columnLabels.lastDocument}</div>
        <div>{translations.columnLabels.status}</div>
        <div className="hidden lg:block" />
      </div>

      {/* Table rows */}
      <div className="divide-y">
        {data.map((contact) => (
          <ContactTableRow
            key={contact.id}
            contact={contact}
            isSelected={isSelected(contact.id)}
            onToggle={() => toggle(contact.id)}
            translations={translations}
          />
        ))}
      </div>
    </BulkSelectionLayout>
  );
}
