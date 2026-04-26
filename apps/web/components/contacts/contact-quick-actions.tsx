"use client";

import { useState, useRef, useEffect } from "react";
import {
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
import type {
  ContactItem,
  ContactTableTranslations,
} from "./contact-table-types";

export function ContactQuickActions({
  contact,
  labels,
}: {
  contact: ContactItem;
  labels: ContactTableTranslations["quickActionLabels"];
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
        aria-label={labels.ariaLabel}
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
