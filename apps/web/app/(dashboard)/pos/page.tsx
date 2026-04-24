"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Trash2,
  Check,
  Package,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { listInventoryItemsAction } from "@/app/actions/inventory-items";
import {
  createDocumentAction,
  recordPaymentAction,
  updateDocumentStatusAction,
} from "@/app/actions/documents";
import { formatCurrency } from "@/lib/utils";
import Decimal from "decimal.js";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";

type PaymentMethod = "cash" | "card" | "twint";

interface CartItem {
  id: string;
  itemNumber: string;
  description: string;
  askingPrice: string;
  condition: string;
  photoBase64?: string | null;
}

interface SearchResult {
  id: string;
  itemNumber: string;
  description: string;
  askingPrice: string | null;
  condition: string;
  photoBase64?: string | null;
  status: string;
}

const PAYMENT_METHODS: {
  value: PaymentMethod;
  icon: React.ReactNode;
  labelKey: string;
}[] = [
  {
    value: "cash",
    icon: <Banknote className="h-5 w-5" />,
    labelKey: "posCash",
  },
  {
    value: "card",
    icon: <CreditCard className="h-5 w-5" />,
    labelKey: "posCard",
  },
  {
    value: "twint",
    icon: <Smartphone className="h-5 w-5" />,
    labelKey: "posTwint",
  },
];

export default function PosPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    invoiceId: string;
    number: string;
  } | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  // ─── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      const res = await listInventoryItemsAction({
        search: q,
        pageSize: 20,
      });
      if (res.success && res.data) {
        setResults(res.data.data as SearchResult[]);
      }
      setSearching(false);
    }, 300);
  }, []);

  // ─── Cart ops ───────────────────────────────────────────────────────────────
  function addToCart(item: SearchResult) {
    if (!item.askingPrice || Number(item.askingPrice) === 0) return;
    if (cart.some((c) => c.id === item.id)) return; // each item once
    setCart((prev) => [
      ...prev,
      {
        id: item.id,
        itemNumber: item.itemNumber,
        description: item.description,
        askingPrice: item.askingPrice!,
        condition: item.condition,
        photoBase64: item.photoBase64,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }

  // ─── Total ──────────────────────────────────────────────────────────────────
  const total = cart.reduce(
    (sum, item) => sum.plus(new Decimal(item.askingPrice)),
    new Decimal(0),
  );

  // ─── Complete sale ──────────────────────────────────────────────────────────
  function handleCompleteSale() {
    if (cart.length === 0) return;
    setError(null);
    startTransition(async () => {
      // Create invoice (contactId = null = anonymous cash sale)
      const docResult = await createDocumentAction({
        type: "invoice",
        contactId: null,
        currency: "CHF",
        items: cart.map((item, i) => ({
          position: i,
          description: item.description,
          quantity: "1",
          unitPrice: item.askingPrice,
          vatRate: DEFAULT_VAT_RATE,
          discount: "0",
          inventoryItemId: item.id,
        })),
      });

      if (!docResult.success || !docResult.data) {
        setError(docResult.error || tc("error"));
        return;
      }

      const invoiceId = docResult.data.id;

      // Mark as sent → confirmed → paid via status transitions
      await updateDocumentStatusAction(invoiceId, "sent");
      await updateDocumentStatusAction(invoiceId, "confirmed");

      // Record payment
      const payResult = await recordPaymentAction(invoiceId, {
        amount: total.toFixed(2),
        date: new Date().toISOString().split("T")[0],
        method:
          paymentMethod === "cash"
            ? "cash"
            : paymentMethod === "card"
              ? "card"
              : "other",
        reference: paymentMethod === "twint" ? "TWINT" : undefined,
      });

      if (!payResult.success) {
        setError(payResult.error || tc("error"));
        return;
      }

      setCompleted({ invoiceId, number: docResult.data.number });
    });
  }

  // ─── Post-sale ──────────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <Check className="h-10 w-10 text-success" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t("posSaleComplete")}</h2>
          <p className="mt-1 text-muted-foreground">
            {t("posInvoiceNumber", { number: completed.number })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() =>
              router.push(`/sales/invoices/${completed.invoiceId}`)
            }
            className="rounded-xl border px-5 py-3 text-sm font-medium hover:bg-muted"
          >
            {t("posViewInvoice")}
          </button>
          <button
            onClick={() => {
              setCart([]);
              setCompleted(null);
              setPaymentMethod("cash");
            }}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("posNewSale")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      {/* ── Left: Search + Cart ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("posSearchItems")}
            className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="rounded-xl border bg-card divide-y overflow-y-auto max-h-64 shrink-0">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={
                  !item.askingPrice || cart.some((c) => c.id === item.id)
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors disabled:opacity-40"
              >
                {item.photoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.photoBase64}
                    alt=""
                    className="h-10 w-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">
                    {item.description}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.itemNumber}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {item.askingPrice ? formatCurrency(item.askingPrice) : "—"}
                </span>
              </button>
            ))}
            {searching && (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                {tc("loading")}…
              </div>
            )}
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 rounded-xl border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">{t("posCart")}</h2>
            {cart.length > 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {cart.length}
              </span>
            )}
          </div>
          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center py-8">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {t("posEmptyCart")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("posSearchHint")}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {item.photoBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photoBase64}
                      alt=""
                      className="h-9 w-9 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {item.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.itemNumber}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrency(item.askingPrice)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Payment panel ─────────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col gap-4">
        {/* Total */}
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{tc("total")}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {formatCurrency(total.toFixed(2))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {cart.length} {cart.length === 1 ? tc("item") : tc("items")}
          </p>
        </div>

        {/* Payment method */}
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-medium">{t("posPaymentMethod")}</p>
          <div className="flex flex-col gap-2">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left font-medium transition-colors min-h-[48px] ${
                  paymentMethod === pm.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent hover:border-muted-foreground/20 hover:bg-muted"
                }`}
              >
                {pm.icon}
                {t(pm.labelKey as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Complete sale */}
        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || isPending}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[56px]"
        >
          {isPending ? (
            <>{tc("loading")}…</>
          ) : (
            <>
              <Check className="h-5 w-5" />
              {t("posCompleteSale")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
