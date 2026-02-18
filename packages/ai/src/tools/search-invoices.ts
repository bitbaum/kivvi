import { z } from 'zod';
import Decimal from 'decimal.js';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { listDocuments } from '@kivvi/core';
import { getDb } from './utils';

const searchInvoicesSchema = z.object({
  query: z.string().optional().describe('Search query for invoice number, customer name, or notes'),
  status: z.enum(['draft', 'sent', 'confirmed', 'delivered', 'paid', 'partially_paid', 'overdue', 'cancelled'])
    .optional()
    .describe('Filter by invoice status'),
  dateFrom: z.string().optional().describe('Filter invoices from this date (ISO 8601)'),
  dateTo: z.string().optional().describe('Filter invoices until this date (ISO 8601)'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

export const searchInvoicesTool: Tool = {
  name: 'search_invoices',
  description: `Search for invoices in the system. Can filter by status (draft, sent, paid, overdue, cancelled), date range, or search by customer name/invoice number. Returns a list of matching invoices with basic details.`,
  parameters: searchInvoicesSchema,
  execute: async (params: z.infer<typeof searchInvoicesSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const db = getDb(context);

      const result = await listDocuments(db, context.companyId, {
        type: 'invoice',
        status: params.status,
        search: params.query,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        pageSize: params.limit,
      });

      // Filter by contact name if query provided (listDocuments only searches number/notes)
      let filteredData = result.data;
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        filteredData = result.data.filter((doc) => {
          const matchesNumber = doc.number.toLowerCase().includes(queryLower);
          const matchesCustomer = doc.contact?.name?.toLowerCase().includes(queryLower);
          const matchesNotes = doc.notes?.toLowerCase().includes(queryLower);
          return matchesNumber || matchesCustomer || matchesNotes;
        });
      }

      const invoiceList = filteredData.map((doc) => ({
        id: doc.id,
        number: doc.number,
        customer: doc.contact?.name || 'Unknown',
        status: doc.status,
        issueDate: doc.issueDate.toISOString().split('T')[0],
        dueDate: doc.dueDate?.toISOString().split('T')[0] || null,
        total: `${doc.currency} ${new Decimal(doc.total || '0').toFixed(2)}`,
        isOverdue: doc.status !== 'paid' && doc.dueDate && new Date(doc.dueDate) < new Date(),
      }));

      if (invoiceList.length === 0) {
        return {
          success: true,
          message: 'No invoices found matching your criteria.',
          data: { invoices: [], count: 0 },
        };
      }

      const totalAmount = filteredData.reduce((sum, doc) => sum.plus(doc.total || '0'), new Decimal(0));
      const unpaidCount = filteredData.filter((doc) => doc.status !== 'paid').length;

      return {
        success: true,
        message: `Found ${invoiceList.length} invoice(s).`,
        data: {
          invoices: invoiceList,
          count: invoiceList.length,
          totalAmount: `${context.defaultCurrency} ${totalAmount.toFixed(2)}`,
          unpaidCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search invoices: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
