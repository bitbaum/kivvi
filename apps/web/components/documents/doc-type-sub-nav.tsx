"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Tab {
  labelKey: string;
  href: string;
}

const SALES_TABS: Tab[] = [
  { labelKey: "invoices", href: "/sales/invoices" },
  { labelKey: "quotes", href: "/sales/quotes" },
  { labelKey: "orders", href: "/sales/orders" },
  { labelKey: "deliveryNotes", href: "/sales/delivery-notes" },
  { labelKey: "creditNotes", href: "/sales/credit-notes" },
  { labelKey: "dunning", href: "/sales/dunning" },
];

const PURCHASING_TABS: Tab[] = [
  { labelKey: "purchaseInvoices", href: "/purchasing/purchase-invoices" },
  { labelKey: "purchaseOrders", href: "/purchasing/purchase-orders" },
];

const TABS: Record<"sales" | "purchasing", Tab[]> = {
  sales: SALES_TABS,
  purchasing: PURCHASING_TABS,
};

interface Props {
  section: "sales" | "purchasing";
}

export function DocTypeSubNav({ section }: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = TABS[section];

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1"
      aria-label={t(section)}
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
