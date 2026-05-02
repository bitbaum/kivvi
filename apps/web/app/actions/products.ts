"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  createProductSchema,
  updateProductSchema,
} from "@kivvi/core";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { parseFormData } from "./parse-form-data";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import { getTranslations } from "next-intl/server";

/**
 * Convert raw form data to product-specific input with correct types.
 */
function parseProductFormData(formData: FormData) {
  const raw = parseFormData(formData);
  return {
    name: raw.name ?? "",
    description: raw.description,
    type: raw.type as "product" | "service",
    sku: raw.sku,
    ean: raw.ean,
    manufacturerId: raw.manufacturerId,
    productGroupId: raw.productGroupId,
    unitPrice: raw.unitPrice ?? "0",
    purchasePrice: raw.purchasePrice,
    currency: raw.currency ?? DEFAULT_CURRENCY,
    vatRate: raw.vatRate ?? "0",
    unit: raw.unit ?? "piece",
    weight: raw.weight,
    width: raw.width,
    height: raw.height,
    depth: raw.depth,
    minStock: raw.minStock ? Number(raw.minStock) : null,
    serialNumberTracking: formData.get("serialNumberTracking") === "on",
    shopVisible: formData.get("shopVisible") === "on",
    isPriceFlexible: formData.get("isPriceFlexible") === "true",
    minPrice: raw.minPrice || null,
    maxPrice: raw.maxPrice || null,
    notes: raw.notes,
  };
}

export async function createProductAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("products");
  try {
    const { companyId } = await requireRole("member");

    const input = parseProductFormData(formData);

    // Validate
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const product = await createProduct(db, companyId, parsed.data);

    revalidatePath("/products");

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToCreate")),
    };
  }
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("products");
  try {
    const { companyId } = await requireRole("member");

    const input = parseProductFormData(formData);

    // Validate
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const product = await updateProduct(db, companyId, productId, parsed.data);

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUpdate")),
    };
  }
}

export async function deleteProductAction(
  productId: string,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("products");
  try {
    const { companyId } = await requireRole("member");

    const product = await deleteProduct(db, companyId, productId);

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToDelete")),
    };
  }
}

export async function searchProductsAction(
  query: string,
): Promise<ActionResult<Awaited<ReturnType<typeof searchProducts>>>> {
  const t = await getTranslations("products");
  try {
    const { companyId } = await getSession();
    const results = await searchProducts(db, companyId, query);
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorSearchFailed")),
    };
  }
}
