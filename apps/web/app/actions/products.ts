'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
} from '@kivvi/core';
import { safeErrorMessage } from './utils';

interface ActionResult {
  success: boolean;
  data?: { id: string };
  error?: string;
}

/**
 * Parse form data into a plain object, handling checkboxes and empty strings.
 */
function parseProductFormData(formData: FormData) {
  return {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    type: formData.get('type') as 'product' | 'service',
    sku: (formData.get('sku') as string) || null,
    ean: (formData.get('ean') as string) || null,
    manufacturerId: (formData.get('manufacturerId') as string) || null,
    productGroupId: (formData.get('productGroupId') as string) || null,
    unitPrice: formData.get('unitPrice') as string,
    purchasePrice: (formData.get('purchasePrice') as string) || null,
    currency: (formData.get('currency') as string) || 'CHF',
    vatRate: formData.get('vatRate') as string,
    unit: (formData.get('unit') as string) || 'piece',
    weight: (formData.get('weight') as string) || null,
    width: (formData.get('width') as string) || null,
    height: (formData.get('height') as string) || null,
    depth: (formData.get('depth') as string) || null,
    minStock: formData.get('minStock') ? Number(formData.get('minStock')) : null,
    serialNumberTracking: formData.get('serialNumberTracking') === 'on',
    shopVisible: formData.get('shopVisible') === 'on',
    notes: (formData.get('notes') as string) || null,
  };
}

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return { success: false, error: 'Unauthorized' };
    }

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

    const product = await createProduct(db, session.user.companyId, parsed.data);

    revalidatePath('/products');

    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error('Failed to create product:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to create product'),
    };
  }
}

export async function updateProductAction(
  productId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return { success: false, error: 'Unauthorized' };
    }

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

    const product = await updateProduct(db, session.user.companyId, productId, parsed.data);

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error('Failed to update product:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to update product'),
    };
  }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return { success: false, error: 'Unauthorized' };
    }

    const product = await deleteProduct(db, session.user.companyId, productId);

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);

    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error('Failed to delete product:', error);
    return {
      success: false,
      error: safeErrorMessage(error, 'Failed to delete product'),
    };
  }
}
