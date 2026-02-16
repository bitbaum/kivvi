import { z } from 'zod';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { getFinancialSummary } from '@kivvi/core';
import { getDb } from './utils';

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
      const db = getDb(context);

      const summary = await getFinancialSummary(db, context.companyId);

      // Determine period label for display
      const now = new Date();
      const period = params.period || 'month';
      let periodLabel: string;

      switch (period) {
        case 'month': {
          periodLabel = `${now.toLocaleString('de-CH', { month: 'long' })} ${now.getFullYear()}`;
          break;
        }
        case 'quarter': {
          const quarterNum = Math.floor(now.getMonth() / 3) + 1;
          periodLabel = `Q${quarterNum} ${now.getFullYear()}`;
          break;
        }
        case 'year': {
          periodLabel = `${now.getFullYear()}`;
          break;
        }
      }

      const currency = context.defaultCurrency;

      // The domain function returns monthly revenue, yearly revenue, outstanding, overdue, and drafts.
      // Map to the tool's output format based on the requested period.
      const revenueAmount = period === 'year' ? summary.revenueThisYear : summary.revenueThisMonth;
      const revenueCount = period === 'year' ? undefined : summary.revenueThisMonthCount;

      return {
        success: true,
        message: `Financial summary for ${periodLabel}.`,
        data: {
          period: periodLabel,
          periodType: period,
          revenue: {
            amount: `${currency} ${revenueAmount.toFixed(2)}`,
            invoiceCount: revenueCount ?? 0,
            label: 'Paid revenue in period',
          },
          outstanding: {
            amount: `${currency} ${summary.outstandingTotal.toFixed(2)}`,
            invoiceCount: summary.outstandingCount,
            label: 'Total outstanding (all unpaid)',
          },
          overdue: {
            amount: `${currency} ${summary.overdueTotal.toFixed(2)}`,
            invoiceCount: summary.overdueCount,
            label: 'Overdue invoices past due date',
          },
          drafts: {
            amount: `${currency} ${summary.draftsTotal.toFixed(2)}`,
            invoiceCount: summary.draftsCount,
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
