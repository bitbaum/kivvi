// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const searchCustomersSchema = z.object({
  query: z.string().optional().describe('Search query for customer name, email, or contact number'),
  type: z.enum(['customer', 'vendor', 'both']).optional().describe('Filter by contact type'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

export const searchCustomersTool: Tool = {
  name: 'search_customers',
  description: `Search for customers and vendors (contacts) in the system. Can search by name, email, phone, contact number, or filter by type (customer, vendor, or both). Returns a list of matching contacts.`,
  parameters: searchCustomersSchema,
  execute: async (params: z.infer<typeof searchCustomersSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, contacts } = await import('@kivvi/database');
      const { eq, and, or, ilike, desc } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      const conditions: any[] = [
        eq(contacts.companyId, context.companyId),
        eq(contacts.isActive, true),
      ];

      if (params.type) {
        conditions.push(eq(contacts.type, params.type));
      }

      if (params.query) {
        conditions.push(
          or(
            ilike(contacts.name, `%${params.query}%`),
            ilike(contacts.email, `%${params.query}%`),
            ilike(contacts.phone, `%${params.query}%`),
            ilike(contacts.contactNumber, `%${params.query}%`)
          )
        );
      }

      const results = await db
        .select()
        .from(contacts)
        .where(and(...conditions))
        .orderBy(desc(contacts.updatedAt))
        .limit(params.limit);

      const customerList = results.map((c) => ({
        id: c.id,
        contactNumber: c.contactNumber,
        name: c.name,
        email: c.email || 'No email',
        phone: c.phone || 'No phone',
        type: c.type,
        city: c.city || 'Unknown',
        paymentTermsDays: c.paymentTermsDays,
      }));

      if (customerList.length === 0) {
        return {
          success: true,
          message: 'No customers found matching your criteria.',
          data: { customers: [], count: 0 },
        };
      }

      return {
        success: true,
        message: `Found ${customerList.length} contact(s).`,
        data: {
          customers: customerList,
          count: customerList.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search customers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
