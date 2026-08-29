"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createProductAction, updateProductAction } from "@/app/actions/products";
import type { Product } from "@kivvi/database";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ProductFormBasicSection,
  ProductFormPricingSection,
  ProductFormInventorySection,
  ProductFormVisibilitySection,
} from "./product-form-sections";

type ProductFormProps = { mode: "create"; product?: never } | { mode: "edit"; product: Product };

export function ProductForm({ mode, product }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productType, setProductType] = useState(product?.type || "product");

  const t = useTranslations("products");
  const tc = useTranslations("common");

  const isEdit = mode === "edit";
  const backHref = isEdit ? `/products/${product.id}` : "/products";

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        const result = await updateProductAction(product.id, formData);
        if (result.success) {
          toast.success(t("updated"));
          router.push(`/products/${product.id}`);
        } else {
          setError(result.error || tc("error"));
          setIsSubmitting(false);
        }
      } else {
        const result = await createProductAction(formData);
        if (result.success && result.data) {
          toast.success(t("created"));
          router.push(`/products/${result.data.id}`);
        } else {
          setError(result.error || tc("error"));
          setIsSubmitting(false);
        }
      }
    } catch {
      setError(tc("error"));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? t("editProduct") : t("newProduct")}</h1>
          <p className="text-muted-foreground">
            {isEdit
              ? `${product.name}${product.articleNumber ? ` (${product.articleNumber})` : ""}`
              : t("subtitle")}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <ProductFormBasicSection
          product={product}
          isEdit={isEdit}
          productType={productType}
          onTypeChange={setProductType}
        />
        <ProductFormPricingSection product={product} isEdit={isEdit} />
        {productType === "product" && (
          <ProductFormInventorySection product={product} isEdit={isEdit} />
        )}
        <ProductFormVisibilitySection product={product} isEdit={isEdit} />

        <div className="flex items-center justify-end gap-3">
          <Link
            href={backHref}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            {tc("cancel")}
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors",
              isSubmitting ? "cursor-not-allowed opacity-70" : "hover:bg-primary/90",
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? isEdit
                ? tc("saving")
                : tc("creating")
              : isEdit
                ? tc("saveChanges")
                : t("createProduct")}
          </button>
        </div>
      </form>
    </div>
  );
}
