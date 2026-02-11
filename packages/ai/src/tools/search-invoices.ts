// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

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
      const { createDb, documents, contacts } = await import('@kivvi/database');
      const { eq, and, or, gte, lte, ilike, desc } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      const conditions: any[] = [
        eq(documents.companyId, context.companyId),
        eq(documents.type, 'invoice'),
      ];

      if (params.status) {
        conditions.push(eq(documents.status, params.status));
      }

      if (params.dateFrom) {
        conditions.push(gte(documents.issueDate, new Date(params.dateFrom)));
      }

      if (params.dateTo) {
        conditions.push(lte(documents.issueDate, new Date(params.dateTo)));
      }

      if (params.query) {
        conditions.push(
          or(
            ilike(documents.number, `%${params.query}%`),
            ilike(documents.notes, `%${params.query}%`)
          )
        );
      }

      const results = await db.query.documents.findMany({
        where: and(...conditions),
        with: { contact: true },
        orderBy: [desc(documents.issueDate)],
        limit: params.limit,
      });

      // Also filter by contact name if query provided
      let filteredResults = results;
      if (params.query) {
        const queryLower = params.query.toLowerCase();
        filteredResults = results.filter((doc) => {
          const matchesNumber = doc.number.toLowerCase().includes(queryLower);
          const matchesCustomer = doc.contact?.name?.toLowerCase().includes(queryLower);
          const matchesNotes = doc.notes?.toLowerCase().includes(queryLower);
          return matchesNumber || matchesCustomer || matchesNotes;
        });
      }

      const invoiceList = filteredResults.map((doc) => ({
        id: doc.id,
        number: doc.number,
        customer: doc.contact?.name || 'Unknown',
        status: doc.status,
        issueDate: doc.issueDate.toISOString().split('T')[0],
        dueDate: doc.dueDate?.toISOString().split('T')[0] || null,
        total: `${doc.currency} ${Number(doc.total).toFixed(2)}`,
        isOverdue: doc.status !== 'paid' && doc.dueDate && new Date(doc.dueDate) < new Date(),
      }));

      if (invoiceList.length === 0) {
        return {
          success: true,
          message: 'No invoices found matching your criteria.',
          data: { invoices: [], count: 0 },
        };
      }

      const totalAmount = filteredResults.reduce((sum, doc) => sum + Number(doc.total), 0);
      const unpaidCount = filteredResults.filter((doc) => doc.status !== 'paid').length;

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
