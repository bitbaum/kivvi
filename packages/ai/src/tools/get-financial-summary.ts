// @ts-nocheck
import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';

const getFinancialSummarySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).optional().describe(
    'Time period for the summary. Defaults to current month.'
  ),
});

export const getFinancialSummaryTool: Tool = {
  name: 'get_financial_summary',
  description: `Get a financial overview of the company including total revenue, outstanding invoices, overdue amounts, and document counts. Can be filtered by period (current month, quarter, or year).`,
  parameters: getFinancialSummarySchema,
  execute: async (params: z.infer<typeof getFinancialSummarySchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { createDb, documents } = await import('@kivvi/database');
      const { eq, and, gte, lte, sql } = await import('drizzle-orm');

      const db = createDb(process.env.DATABASE_URL!);

      // Determine date range based on period
      const now = new Date();
      let periodStart: Date;
      let periodLabel: string;

      const period = params.period || 'month';

      switch (period) {
        case 'month': {
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = `${now.toLocaleString('de-CH', { month: 'long' })} ${now.getFullYear()}`;
          break;
        }
        case 'quarter': {
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          periodStart = new Date(now.getFullYear(), quarterMonth, 1);
          const quarterNum = Math.floor(now.getMonth() / 3) + 1;
          periodLabel = `Q${quarterNum} ${now.getFullYear()}`;
          break;
        }
        case 'year': {
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodLabel = `${now.getFullYear()}`;
          break;
        }
      }

      const periodEnd = now;

      // Base conditions: company's invoices
      const baseConditions = [
        eq(documents.companyId, context.companyId),
        eq(documents.type, 'invoice'),
      ];

      // Revenue: paid invoices within the period
      const paidInvoices = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${documents.total}::numeric), 0)`,
        })
        .from(documents)
        .where(
          and(
            ...baseConditions,
            eq(documents.status, 'paid'),
            gte(documents.paidDate, periodStart),
            lte(documents.paidDate, periodEnd)
          )
        );

      // Outstanding: unpaid invoices (sent, confirmed, delivered, partially_paid, overdue)
      const outstandingInvoices = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${documents.total}::numeric), 0)`,
        })
        .from(documents)
        .where(
          and(
            ...baseConditions,
            sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`
          )
        );

      // Overdue: invoices past due date that are not paid/cancelled
      const overdueInvoices = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${documents.total}::numeric), 0)`,
        })
        .from(documents)
        .where(
          and(
            ...baseConditions,
            sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`,
            lte(documents.dueDate, now)
          )
        );

      // Invoices issued in the period (all statuses)
      const issuedInvoices = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${documents.total}::numeric), 0)`,
        })
        .from(documents)
        .where(
          and(
            ...baseConditions,
            gte(documents.issueDate, periodStart),
            lte(documents.issueDate, periodEnd)
          )
        );

      // Draft invoices (not yet sent)
      const draftInvoices = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sql<string>`coalesce(sum(${documents.total}::numeric), 0)`,
        })
        .from(documents)
        .where(
          and(
            ...baseConditions,
            eq(documents.status, 'draft')
          )
        );

      const currency = context.defaultCurrency;
      const revenue = Number(paidInvoices[0]?.total || 0);
      const outstanding = Number(outstandingInvoices[0]?.total || 0);
      const overdue = Number(overdueInvoices[0]?.total || 0);
      const issued = Number(issuedInvoices[0]?.total || 0);
      const drafts = Number(draftInvoices[0]?.total || 0);

      return {
        success: true,
        message: `Financial summary for ${periodLabel}.`,
        data: {
          period: periodLabel,
          periodType: period,
          revenue: {
            amount: `${currency} ${revenue.toFixed(2)}`,
            invoiceCount: paidInvoices[0]?.count || 0,
            label: 'Paid revenue in period',
          },
          issued: {
            amount: `${currency} ${issued.toFixed(2)}`,
            invoiceCount: issuedInvoices[0]?.count || 0,
            label: 'Invoices issued in period',
          },
          outstanding: {
            amount: `${currency} ${outstanding.toFixed(2)}`,
            invoiceCount: outstandingInvoices[0]?.count || 0,
            label: 'Total outstanding (all unpaid)',
          },
          overdue: {
            amount: `${currency} ${overdue.toFixed(2)}`,
            invoiceCount: overdueInvoices[0]?.count || 0,
            label: 'Overdue invoices past due date',
          },
          drafts: {
            amount: `${currency} ${drafts.toFixed(2)}`,
            invoiceCount: draftInvoices[0]?.count || 0,
            label: 'Draft invoices not yet sent',
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get financial summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
