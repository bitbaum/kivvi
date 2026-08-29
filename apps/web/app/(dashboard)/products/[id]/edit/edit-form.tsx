"use client";

import type { Product } from "@kivvi/database";
import { ProductForm } from "@/components/products/product-form";

interface EditProductFormProps {
  product: Product;
}

export function EditProductForm({ product }: EditProductFormProps) {
  return <ProductForm mode="edit" product={product} />;
}
