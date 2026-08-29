"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";

export interface Product {
  id: string;
  name: string;
  articleNumber: string | null;
  sku: string | null;
}

interface Props {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
}

export function MovementProductPicker({ products, selectedProduct, onSelect }: Props) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.articleNumber && p.articleNumber.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative">
      <label htmlFor="movement-product-search" className="mb-1 block text-sm font-medium">
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
            aria-label={tc("clear")}
            onClick={() => {
              onSelect(null);
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
              id="movement-product-search"
              type="text"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductDropdown(true);
              }}
              onFocus={() => setShowProductDropdown(true)}
              placeholder={`${tc("search")}...`}
              className="pl-9 pr-3"
            />
          </div>
          {showProductDropdown && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border bg-card shadow-lg">
              {filteredProducts.length === 0 ? (
                <p className="p-3 text-center text-sm text-muted-foreground">{tc("noResults")}</p>
              ) : (
                filteredProducts.slice(0, 20).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelect(product);
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
  );
}
