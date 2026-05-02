"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { listInventoryItemsAction } from "@/app/actions/inventory-items";
import {
  createDocumentAction,
  recordPaymentAction,
  updateDocumentStatusAction,
} from "@/app/actions/documents";
import Decimal from "decimal.js";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import type { CartItem, SearchResult, PaymentMethod } from "./_types";
import { PosCompletionScreen } from "./_components/pos-completion-screen";
import { PosSearch } from "./_components/pos-search";
import { PosCart } from "./_components/pos-cart";
import { PosPaymentPanel } from "./_components/pos-payment-panel";

export default function PosPage() {
  const [isPending, startTransition] = useTransition();
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

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      const res = await listInventoryItemsAction({ search: q, pageSize: 20 });
      if (res.success && res.data) setResults(res.data.data as SearchResult[]);
      setSearching(false);
    }, 300);
  }, []);

  function addToCart(item: SearchResult) {
    if (!item.askingPrice || Number(item.askingPrice) === 0) return;
    if (cart.some((c) => c.id === item.id)) return;
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

  const total = cart.reduce(
    (sum, item) => sum.plus(new Decimal(item.askingPrice)),
    new Decimal(0),
  );

  function handleCompleteSale() {
    if (cart.length === 0) return;
    setError(null);
    startTransition(async () => {
      const docResult = await createDocumentAction({
        type: "invoice",
        contactId: null,
        currency: DEFAULT_CURRENCY,
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
      await updateDocumentStatusAction(invoiceId, "sent");
      await updateDocumentStatusAction(invoiceId, "confirmed");

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

  if (completed) {
    return (
      <PosCompletionScreen
        invoiceId={completed.invoiceId}
        number={completed.number}
        onNewSale={() => {
          setCart([]);
          setCompleted(null);
          setPaymentMethod("cash");
        }}
      />
    );
  }

  const cartIds = new Set(cart.map((c) => c.id));

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <PosSearch
          query={query}
          results={results}
          searching={searching}
          onSearch={handleSearch}
          onAddToCart={addToCart}
          cartIds={cartIds}
        />
        <PosCart
          cart={cart}
          onRemove={(id) => setCart((prev) => prev.filter((c) => c.id !== id))}
        />
      </div>
      <PosPaymentPanel
        total={total.toFixed(2)}
        cartCount={cart.length}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        error={error}
        isPending={isPending}
        onCompleteSale={handleCompleteSale}
      />
    </div>
  );
}
