"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { CONTACT_TYPE_STYLES } from "@/lib/config/contact-types";
import { ContactQuickActions } from "./contact-quick-actions";
import type { ContactItem, ContactTableTranslations } from "./contact-table-types";

interface ContactTableRowProps {
  contact: ContactItem;
  isSelected: boolean;
  onToggle: () => void;
  translations: ContactTableTranslations;
}

export function ContactTableRow({
  contact,
  isSelected,
  onToggle,
  translations,
}: ContactTableRowProps) {
  const tc = useTranslations("common");
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 p-4 transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4 sm:px-6 lg:grid-cols-[auto_1fr_2fr_auto_1.5fr_1fr_1fr_1fr_auto_auto]",
        isSelected && "bg-primary/5",
      )}
    >
      {/* Native link covers the entire row for right-click / Ctrl+click / screen reader support */}
      <Link
        href={`/contacts/${contact.id}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={contact.name}
      />

      {/* Interactive cells raised above the link overlay */}
      <div className="relative z-10 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          aria-label={tc("aria.selectItem", { name: contact.name })}
          className="h-4 w-4 rounded border-input"
        />
      </div>
      <div className="text-sm font-mono text-muted-foreground">{contact.contactNumber || "-"}</div>
      <div>
        <p className="text-sm font-medium">{contact.name}</p>
        {(contact.firstName || contact.lastName) && (
          <p className="text-xs text-muted-foreground">
            {[contact.firstName, contact.lastName].filter(Boolean).join(" ")}
          </p>
        )}
        {/* Mobile: show key info inline */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
          {contact.email && <span>{contact.email}</span>}
          {contact.email && (contact.phone || contact.city) && <span>·</span>}
          {contact.phone && <span>{contact.phone}</span>}
          {contact.phone && contact.city && <span>·</span>}
          {contact.city && <span>{contact.city}</span>}
        </div>
      </div>
      <div>
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
            CONTACT_TYPE_STYLES[contact.type as keyof typeof CONTACT_TYPE_STYLES] || "",
          )}
        >
          {translations.typeLabels[contact.type] || contact.type}
        </span>
      </div>
      <div className="hidden truncate text-sm text-muted-foreground lg:block">
        {contact.email || "-"}
      </div>
      <div className="hidden text-sm text-muted-foreground lg:block">
        {contact.phone || contact.mobile || "-"}
      </div>
      <div className="hidden text-sm text-muted-foreground lg:block">{contact.city || "-"}</div>
      <div className="hidden text-sm text-muted-foreground lg:block">
        {contact.lastDocumentAt ? formatDate(contact.lastDocumentAt) : "-"}
      </div>
      <div>
        <StatusBadge
          variant={contact.isActive ? "active" : "inactive"}
          label={
            contact.isActive ? translations.columnLabels.active : translations.columnLabels.inactive
          }
        />
      </div>
      <div className="relative z-10 hidden lg:flex items-center justify-end">
        <ContactQuickActions contact={contact} labels={translations.quickActionLabels} />
      </div>
    </div>
  );
}
