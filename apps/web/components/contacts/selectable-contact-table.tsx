"use client";

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { useSelection } from "@/hooks/use-selection";
import {
  Loader2,
  MoreHorizontal,
  FileText,
  Receipt,
  ShoppingCart,
  Package,
  FileInput,
  Mail,
  Eye,
  Pencil,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BulkActionToolbar } from "@/components/bulk-action-toolbar";
import { BulkResultBanner } from "@/components/bulk-result-banner";
import {
  bulkDeleteContactsAction,
  bulkDeactivateContactsAction,
} from "@/app/actions/bulk-operations";
import type { BulkOperationResult } from "@/app/actions/bulk-operations";
import { cn, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { CONTACT_TYPE_STYLES } from "@/lib/config/contact-types";
import { SortableHeader } from "@/components/sortable-header";

interface ContactItem {
  id: string;
  contactNumber: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  isActive: boolean | null;
  lastDocumentAt?: Date | null;
}

interface Translations {
  columnLabels: {
    number: string;
    name: string;
    type: string;
    email: string;
    phone: string;
    city: string;
    lastDocument: string;
    status: string;
    active: string;
    inactive: string;
  };
  typeLabels: Record<string, string>;
  bulkLabels: Record<string, string>;
  quickActionLabels: {
    createInvoice: string;
    createQuote: string;
    createOrder: string;
    createPurchaseOrder: string;
    createPurchaseInvoice: string;
    sendEmail: string;
    view: string;
    edit: string;
  };
}

interface SortProps {
  field: string;
  order: "asc" | "desc";
  hrefs: Record<string, string>;
}

interface SelectableContactTableProps {
  data: ContactItem[];
  translations: Translations;
  sort?: SortProps;
}

export function SelectableContactTable({
  data,
  translations,
  sort,
}: SelectableContactTableProps) {
  const tc = useTranslations("common");
  const router = useRouter();
  const allIds = useMemo(() => data.map((c) => c.id), [data]);
  const {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isSomeSelected,
    count,
  } = useSelection(allIds);
  const [bulkResult, setBulkResult] = useState<BulkOperationResult | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<
    "delete" | "deactivate" | null
  >(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useFocusTrap(confirmRef, !!confirmAction);

  const handleComplete = useCallback(
    (result: BulkOperationResult) => {
      setBulkResult(result);
      clear();
    },
    [clear],
  );

  const dismissBanner = useCallback(() => setBulkResult(null), []);

  function executeAction(action: "delete" | "deactivate") {
    if (!confirmAction) {
      setConfirmAction(action);
      return;
    }
    setConfirmAction(null);
    startTransition(async () => {
      const result =
        action === "delete"
          ? await bulkDeleteContactsAction({ contactIds: selectedIds })
          : await bulkDeactivateContactsAction({ contactIds: selectedIds });
      if (result.success && result.data) {
        handleComplete(result.data);
      } else {
        handleComplete({
          successCount: 0,
          failureCount: selectedIds.length,
          results: [],
        });
      }
    });
  }

  return (
    <>
      <BulkResultBanner
        result={bulkResult}
        labels={translations.bulkLabels}
        onDismiss={dismissBanner}
      />

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
        <div className="hidden lg:block">
          {translations.columnLabels.lastDocument}
        </div>
        <div>{translations.columnLabels.status}</div>
        <div className="hidden lg:block" />
      </div>

      {/* Table rows */}
      <div className="divide-y">
        {data.map((contact) => (
          <div
            key={contact.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(`/contacts/${contact.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/contacts/${contact.id}`);
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-1 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid sm:grid-cols-[auto_1fr_2fr_auto_auto] sm:items-center sm:gap-4 sm:px-6 lg:grid-cols-[auto_1fr_2fr_auto_1.5fr_1fr_1fr_1fr_auto]",
              isSelected(contact.id) && "bg-primary/5",
            )}
          >
            <div
              className="flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected(contact.id)}
                onChange={() => toggle(contact.id)}
                aria-label={`Select ${contact.name}`}
                className="h-4 w-4 rounded border-input"
              />
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {contact.contactNumber || "-"}
            </div>
            <div>
              <p className="text-sm font-medium">{contact.name}</p>
              {(contact.firstName || contact.lastName) && (
                <p className="text-xs text-muted-foreground">
                  {[contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
              {/* Mobile: show key info inline */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
                {contact.email && <span>{contact.email}</span>}
                {contact.email && (contact.phone || contact.city) && (
                  <span>·</span>
                )}
                {contact.phone && <span>{contact.phone}</span>}
                {contact.phone && contact.city && <span>·</span>}
                {contact.city && <span>{contact.city}</span>}
              </div>
            </div>
            <div>
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                  CONTACT_TYPE_STYLES[
                    contact.type as keyof typeof CONTACT_TYPE_STYLES
                  ] || "",
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
            <div className="hidden text-sm text-muted-foreground lg:block">
              {contact.city || "-"}
            </div>
            <div className="hidden text-sm text-muted-foreground lg:block">
              {contact.lastDocumentAt
                ? formatDate(contact.lastDocumentAt)
                : "-"}
            </div>
            <div>
              <StatusBadge
                variant={contact.isActive ? "active" : "inactive"}
                label={
                  contact.isActive
                    ? translations.columnLabels.active
                    : translations.columnLabels.inactive
                }
              />
            </div>
            <div
              className="hidden lg:flex items-center justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <ContactQuickActions
                contact={contact}
                labels={translations.quickActionLabels}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bulk action toolbar */}
      <BulkActionToolbar
        count={count}
        selectedLabel={translations.bulkLabels.selected}
        clearLabel={translations.bulkLabels.clearSelection}
        onClear={clear}
      >
        <button
          onClick={() => executeAction("deactivate")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.deactivate}
        </button>
        <button
          onClick={() => executeAction("delete")}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {translations.bulkLabels.delete}
        </button>
      </BulkActionToolbar>

      {/* Confirmation dialog */}
      {confirmAction && (
        <div
          ref={confirmRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onKeyDown={(e) => {
            if (e.key === "Escape") setConfirmAction(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold">
              {translations.bulkLabels.confirmTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {(confirmAction === "delete"
                ? translations.bulkLabels.confirmDelete
                : translations.bulkLabels.confirmDeactivate
              ).replace("{count}", String(selectedIds.length))}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                {translations.bulkLabels.cancel}
              </button>
              <button
                onClick={() => executeAction(confirmAction)}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending
                  ? translations.bulkLabels.processing
                  : translations.bulkLabels.confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// QUICK ACTIONS DROPDOWN
// ============================================================================

function ContactQuickActions({
  contact,
  labels,
}: {
  contact: ContactItem;
  labels: Translations["quickActionLabels"];
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const isCustomer = contact.type === "customer" || contact.type === "both";
  const isVendor = contact.type === "vendor" || contact.type === "both";
  const contactQuery = `contactId=${contact.id}&contactName=${encodeURIComponent(contact.name)}`;

  const actions = [
    // Sales actions (for customers)
    ...(isCustomer
      ? [
          {
            label: labels.createInvoice,
            href: `/sales/invoices/new?${contactQuery}`,
            icon: FileText,
          },
          {
            label: labels.createQuote,
            href: `/sales/quotes/new?${contactQuery}`,
            icon: Receipt,
          },
          {
            label: labels.createOrder,
            href: `/sales/orders/new?${contactQuery}`,
            icon: ShoppingCart,
          },
        ]
      : []),
    // Purchase actions (for vendors)
    ...(isVendor
      ? [
          {
            label: labels.createPurchaseOrder,
            href: `/purchasing/purchase-orders/new?${contactQuery}`,
            icon: Package,
          },
          {
            label: labels.createPurchaseInvoice,
            href: `/purchasing/purchase-invoices/new?${contactQuery}`,
            icon: FileInput,
          },
        ]
      : []),
    // Universal actions
    ...(contact.email
      ? [
          {
            label: labels.sendEmail,
            href: `mailto:${contact.email}`,
            icon: Mail,
          },
        ]
      : []),
    { type: "separator" as const },
    { label: labels.view, href: `/contacts/${contact.id}`, icon: Eye },
    { label: labels.edit, href: `/contacts/${contact.id}/edit`, icon: Pencil },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Quick actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          {actions.map((action, i) => {
            if ("type" in action && action.type === "separator") {
              return <div key={i} className="my-1 h-px bg-border" />;
            }
            const {
              label,
              href,
              icon: Icon,
            } = action as {
              label: string;
              href: string;
              icon: typeof FileText;
            };
            const isExternal = href.startsWith("mailto:");
            return (
              <a
                key={i}
                href={href}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
                {...(isExternal ? { target: "_blank", rel: "noopener" } : {})}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
