"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createStockMovementAction } from "@/app/actions/inventory";
import { MOVEMENT_TYPES } from "@/lib/config/inventory";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  articleNumber: string | null;
  sku: string | null;
}

export function AddMovementForm({ warehouseId }: { warehouseId: string }) {
  const router = useRouter();
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  const movementTypeOptions = MOVEMENT_TYPES.map((mt) => ({
    value: mt,
    label: t(mt),
  }));

  // Product picker state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    if (isOpen && products.length === 0) {
      setProductsLoading(true);
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => setProducts(data))
        .catch(() => setError(tc("error")))
        .finally(() => setProductsLoading(false));
    }
  }, [isOpen, products.length, tc]);

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.articleNumber && p.articleNumber.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError(t("selectProductRequired"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    const input = {
      productId: selectedProduct.id,
      warehouseId,
      type: formData.get("type") as string,
      quantity: formData.get("quantity") as string,
      reference: (formData.get("reference") as string) || undefined,
    };

    if (!input.type || !input.quantity) {
      setError(t("allFieldsRequired"));
      return;
    }

    startTransition(async () => {
      const result = await createStockMovementAction(input);
      if (result.success) {
        setIsOpen(false);
        setSelectedProduct(null);
        setProductSearch("");
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setSelectedProduct(null);
    setProductSearch("");
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("recordMovement")}
      </Button>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("recordMovement")}</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Picker */}
          <div className="relative">
            <label
              htmlFor="add-movement-product-search"
              className="mb-1 block text-sm font-medium"
            >
              {t("product")} <span className="text-destructive">*</span>
            </label>
            {selectedProduct ? (
              <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedProduct.articleNumber || selectedProduct.sku || ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    setProductSearch("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormInput
                    id="add-movement-product-search"
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder={
                      productsLoading
                        ? `${tc("loading")}...`
                        : `${tc("search")}...`
                    }
                    className="pl-9 pr-3"
                    disabled={productsLoading}
                  />
                </div>
                {showProductDropdown && !productsLoading && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-lg">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">
                        {tc("noResults")}
                      </p>
                    ) : (
                      filteredProducts.slice(0, 20).map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductDropdown(false);
                            setProductSearch("");
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <span className="font-medium">{product.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {product.articleNumber || ""}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Movement Type */}
          <div>
            <label
              htmlFor="add-movement-type"
              className="mb-1 block text-sm font-medium"
            >
              {t("movementType")} <span className="text-destructive">*</span>
            </label>
            <FormSelect id="add-movement-type" name="type" required>
              <option value="">{tc("pleaseSelect")}</option>
              {movementTypeOptions.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </FormSelect>
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="add-movement-quantity"
              className="mb-1 block text-sm font-medium"
            >
              {t("quantity")} <span className="text-destructive">*</span>
            </label>
            <FormInput
              id="add-movement-quantity"
              name="quantity"
              type="number"
              required
              min="0.01"
              step="0.01"
              placeholder={t("placeholders.quantity")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("quantityHelp")}
            </p>
          </div>

          {/* Reference */}
          <div>
            <label
              htmlFor="add-movement-reference"
              className="mb-1 block text-sm font-medium"
            >
              {t("reference")}
            </label>
            <FormInput
              id="add-movement-reference"
              name="reference"
              type="text"
              placeholder={t("placeholders.movementReference")}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? tc("saving") : t("recordMovement")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              {tc("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
