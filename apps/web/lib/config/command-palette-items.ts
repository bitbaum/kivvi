import {
  LayoutDashboard,
  FileText,
  Receipt,
  ClipboardList,
  Truck,
  CreditCard,
  AlertTriangle,
  BookOpen,
  Warehouse,
  ArrowUpDown,
  Users,
  Package,
  Wallet,
  BarChart3,
  FolderKanban,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/config/document-types";

export interface PaletteItemConfig {
  id: string;
  /** i18n key resolved at runtime via useTranslations */
  nameKey: string;
  href: string;
  icon: LucideIcon;
  /** Which translation namespace this key belongs to: 'nav' or 'commandPalette' */
  ns: "nav" | "commandPalette";
}

// Document type to detail page route prefix — derived from DOCUMENT_TYPES config (SSOT)
export const DOCUMENT_ROUTE_PREFIX: Record<string, string> = Object.fromEntries(
  Object.entries(DOCUMENT_TYPES).map(([type, config]) => [
    type,
    config.basePath,
  ]),
);

// Section display order and i18n keys
export const SECTION_ORDER = [
  "actions",
  "recent",
  "navigation",
  "contacts",
  "products",
  "documents",
] as const;

export const SECTION_LABEL_KEYS: Record<string, string> = {
  navigation: "navigation",
  actions: "actions",
  recent: "recent",
  contacts: "contacts",
  products: "products",
  documents: "documents",
};

export const NAVIGATION_ITEMS: PaletteItemConfig[] = [
  {
    id: "nav-dashboard",
    nameKey: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    ns: "nav",
  },
  {
    id: "nav-quotes",
    nameKey: "quotes",
    href: "/sales/quotes",
    icon: FileText,
    ns: "nav",
  },
  {
    id: "nav-orders",
    nameKey: "orders",
    href: "/sales/orders",
    icon: ClipboardList,
    ns: "nav",
  },
  {
    id: "nav-invoices",
    nameKey: "invoices",
    href: "/sales/invoices",
    icon: Receipt,
    ns: "nav",
  },
  {
    id: "nav-delivery-notes",
    nameKey: "deliveryNotes",
    href: "/sales/delivery-notes",
    icon: Truck,
    ns: "nav",
  },
  {
    id: "nav-credit-notes",
    nameKey: "creditNotes",
    href: "/sales/credit-notes",
    icon: CreditCard,
    ns: "nav",
  },
  {
    id: "nav-dunning",
    nameKey: "dunning",
    href: "/sales/dunning",
    icon: AlertTriangle,
    ns: "nav",
  },
  {
    id: "nav-purchase-orders",
    nameKey: "purchaseOrders",
    href: "/purchasing/purchase-orders",
    icon: ClipboardList,
    ns: "nav",
  },
  {
    id: "nav-purchase-invoices",
    nameKey: "purchaseInvoices",
    href: "/purchasing/purchase-invoices",
    icon: Receipt,
    ns: "nav",
  },
  {
    id: "nav-accounting",
    nameKey: "accounting",
    href: "/accounting",
    icon: BookOpen,
    ns: "nav",
  },
  {
    id: "nav-chart",
    nameKey: "chartOfAccounts",
    href: "/accounting/chart-of-accounts",
    icon: FileText,
    ns: "nav",
  },
  {
    id: "nav-journal",
    nameKey: "journal",
    href: "/accounting/journal",
    icon: ClipboardList,
    ns: "nav",
  },
  {
    id: "nav-fiscal",
    nameKey: "fiscalYears",
    href: "/accounting/fiscal-years",
    icon: BarChart3,
    ns: "nav",
  },
  {
    id: "nav-warehouses",
    nameKey: "warehouses",
    href: "/inventory",
    icon: Warehouse,
    ns: "nav",
  },
  {
    id: "nav-stock",
    nameKey: "stockMovements",
    href: "/inventory/movements",
    icon: ArrowUpDown,
    ns: "nav",
  },
  {
    id: "nav-contacts",
    nameKey: "contacts",
    href: "/contacts",
    icon: Users,
    ns: "nav",
  },
  {
    id: "nav-products",
    nameKey: "products",
    href: "/products",
    icon: Package,
    ns: "nav",
  },
  {
    id: "nav-banking",
    nameKey: "banking",
    href: "/banking",
    icon: Wallet,
    ns: "nav",
  },
  {
    id: "nav-reports",
    nameKey: "reports",
    href: "/reports",
    icon: BarChart3,
    ns: "nav",
  },
  {
    id: "nav-projects",
    nameKey: "projects",
    href: "/projects",
    icon: FolderKanban,
    ns: "nav",
  },
  {
    id: "nav-settings",
    nameKey: "settings",
    href: "/settings",
    icon: Settings,
    ns: "nav",
  },
];

export const QUICK_ACTIONS: PaletteItemConfig[] = [
  {
    id: "action-invoice",
    nameKey: "newInvoice",
    href: "/sales/invoices/new",
    icon: Receipt,
    ns: "commandPalette",
  },
  {
    id: "action-quote",
    nameKey: "newQuote",
    href: "/sales/quotes/new",
    icon: FileText,
    ns: "commandPalette",
  },
  {
    id: "action-order",
    nameKey: "newOrder",
    href: "/sales/orders/new",
    icon: ClipboardList,
    ns: "commandPalette",
  },
  {
    id: "action-credit-note",
    nameKey: "newCreditNote",
    href: "/sales/credit-notes/new",
    icon: CreditCard,
    ns: "commandPalette",
  },
  {
    id: "action-delivery-note",
    nameKey: "newDeliveryNote",
    href: "/sales/delivery-notes/new",
    icon: Truck,
    ns: "commandPalette",
  },
  {
    id: "action-purchase-order",
    nameKey: "newPurchaseOrder",
    href: "/purchasing/purchase-orders/new",
    icon: ClipboardList,
    ns: "commandPalette",
  },
  {
    id: "action-contact",
    nameKey: "newContact",
    href: "/contacts/new",
    icon: Users,
    ns: "commandPalette",
  },
  {
    id: "action-product",
    nameKey: "newProduct",
    href: "/products/new",
    icon: Package,
    ns: "commandPalette",
  },
  {
    id: "action-journal",
    nameKey: "newJournalEntry",
    href: "/accounting/journal/new",
    icon: BookOpen,
    ns: "commandPalette",
  },
  {
    id: "action-project",
    nameKey: "newProject",
    href: "/projects/new",
    icon: FolderKanban,
    ns: "commandPalette",
  },
];
