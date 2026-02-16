import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { getDocument } from '@kivvi/core';

const getInvoiceDetailsSchema = z.object({
  invoiceId: z.string().uuid().describe('The UUID of the invoice to retrieve'),
});

export const getInvoiceDetailsTool: Tool = {
  name: 'get_invoice_details',
  description: `Get detailed information about a specific invoice including line items, customer details, and payment status. Requires the invoice ID.`,
  parameters: getInvoiceDetailsSchema,
  execute: async (params: z.infer<typeof getInvoiceDetailsSchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const db = context.db as any;

      const doc = await getDocument(db, context.companyId, params.invoiceId);

      if (!doc) {
        return {
          success: false,
          error: 'Invoice not found or you do not have access to it.',
        };
      }

      if (doc.type !== 'invoice') {
        return {
          success: false,
          error: 'Invoice not found or you do not have access to it.',
        };
      }

      const isOverdue = doc.status !== 'paid' && doc.dueDate && new Date(doc.dueDate) < new Date();
      const daysOverdue = isOverdue && doc.dueDate
        ? Math.floor((Date.now() - new Date(doc.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const totalPaid = (doc.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      return {
        success: true,
        message: `Retrieved details for invoice ${doc.number}.`,
        data: {
          id: doc.id,
          number: doc.number,
          status: doc.status,
          customer: {
            name: doc.contact?.name,
            email: doc.contact?.email,
            address: doc.contact?.address,
            city: doc.contact?.city,
            country: doc.contact?.country,
          },
          dates: {
            issued: doc.issueDate.toISOString().split('T')[0],
            due: doc.dueDate?.toISOString().split('T')[0] || null,
            paid: doc.paidDate?.toISOString().split('T')[0] || null,
          },
          isOverdue,
          daysOverdue,
          items: (doc.items || []).map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            vatRate: Number(item.vatRate),
            total: Number(item.total),
            product: item.product?.name || null,
          })),
          totals: {
            subtotal: `${doc.currency} ${Number(doc.subtotal).toFixed(2)}`,
            vat: `${doc.currency} ${Number(doc.vatAmount).toFixed(2)}`,
            total: `${doc.currency} ${Number(doc.total).toFixed(2)}`,
            paid: `${doc.currency} ${totalPaid.toFixed(2)}`,
            outstanding: `${doc.currency} ${(Number(doc.total) - totalPaid).toFixed(2)}`,
          },
          notes: doc.notes,
          qrReference: doc.qrReference,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get invoice details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
