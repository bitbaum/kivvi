// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const searchProductsSchema = z.object({
  query: z.string().optional().describe('Search query for product name, SKU, or article number'),
  type: z.enum(['product', 'service']).optional().describe('Filter by product type'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

export const searchProductsTool: Tool = {
  name: 'search_products',
  description: `Search for products and services in the catalog. Can search by name, SKU, EAN, or article number. Filter by type (product or service). Returns matching items with prices and stock info.`,
  parameters: searchProductsSchema,
  execute: async (params: z.infer<typeof searchProductsSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, products } = await import('@kivvi/database');
      const { eq, and, or, ilike, desc } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      const conditions: any[] = [
        eq(products.companyId, context.companyId),
        eq(products.isActive, true),
      ];

      if (params.type) {
        conditions.push(eq(products.type, params.type));
      }

      if (params.query) {
        conditions.push(
          or(
            ilike(products.name, `%${params.query}%`),
            ilike(products.sku, `%${params.query}%`),
            ilike(products.articleNumber, `%${params.query}%`),
            ilike(products.ean, `%${params.query}%`),
            ilike(products.description, `%${params.query}%`)
          )
        );
      }

      const results = await db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.updatedAt))
        .limit(params.limit);

      const productList = results.map((p) => ({
        id: p.id,
        articleNumber: p.articleNumber || null,
        sku: p.sku || null,
        name: p.name,
        description: p.description || null,
        type: p.type,
        unitPrice: `${p.currency || context.defaultCurrency} ${Number(p.unitPrice).toFixed(2)}`,
        purchasePrice: p.purchasePrice ? `${p.currency || context.defaultCurrency} ${Number(p.purchasePrice).toFixed(2)}` : null,
        vatRate: `${Number(p.vatRate)}%`,
        unit: p.unit,
        stockQuantity: p.type === 'product' ? Number(p.stockQuantity) : null,
        minStock: p.type === 'product' ? p.minStock : null,
        lowStock: p.type === 'product' && p.minStock != null
          ? Number(p.stockQuantity) <= p.minStock
          : false,
      }));

      if (productList.length === 0) {
        return {
          success: true,
          message: 'No products found matching your criteria.',
          data: { products: [], count: 0 },
        };
      }

      return {
        success: true,
        message: `Found ${productList.length} product(s).`,
        data: {
          products: productList,
          count: productList.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search products: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
