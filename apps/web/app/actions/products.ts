'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
} from '@kivvi/core';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import { parseFormData } from './parse-form-data';

/**
 * Convert raw form data to product-specific input with correct types.
 */
function parseProductFormData(formData: FormData) {
  const raw = parseFormData(formData);
  return {
    name: raw.name ?? '',
    description: raw.description,
    type: raw.type as 'product' | 'service',
    sku: raw.sku,
    ean: raw.ean,
    manufacturerId: raw.manufacturerId,
    productGroupId: raw.productGroupId,
    unitPrice: raw.unitPrice ?? '0',
    purchasePrice: raw.purchasePrice,
    currency: raw.currency ?? 'CHF',
    vatRate: raw.vatRate ?? '0',
    unit: raw.unit ?? 'piece',
    weight: raw.weight,
    width: raw.width,
    height: raw.height,
    depth: raw.depth,
    minStock: raw.minStock ? Number(raw.minStock) : null,
    serialNumberTracking: formData.get('serialNumberTracking') === 'on',
    shopVisible: formData.get('shopVisible') === 'on',
    notes: raw.notes,
  };
}

export async function createProductAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await getSession();

    const input = parseProductFormData(formData);

    // Validate
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const product = await createProduct(db, companyId, parsed.data);

    revalidatePath('/products');

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to create product'),
    };
  }
}

export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await getSession();

    const input = parseProductFormData(formData);

    // Validate
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const product = await updateProduct(db, companyId, productId, parsed.data);

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to update product'),
    };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await getSession();

    const product = await deleteProduct(db, companyId, productId);

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to delete product'),
    };
  }
}
