import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { listContacts } from '@kivvi/core';

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
      const db = context.db as any;

      const result = await listContacts(db, context.companyId, {
        type: params.type,
        search: params.query,
        pageSize: params.limit,
      });

      const customerList = result.data.map((c: any) => ({
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
