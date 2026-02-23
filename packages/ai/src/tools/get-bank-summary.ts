import { z } from 'zod';
import Decimal from 'decimal.js';
import type { Tool, ExecutionContext, ToolResult } from '../types';
import { getDb } from './utils';

const getBankSummarySchema = z.object({});

export const getBankSummaryTool: Tool = {
  name: 'get_bank_summary',
  description: `Get an overview of all bank accounts with balances and reconciliation status. Shows total balance across all accounts and how many transactions are unreconciled.`,
  parameters: getBankSummarySchema,
  requiredPermissions: ['banking:read'],
  execute: async (_params: z.infer<typeof getBankSummarySchema>, context: ExecutionContext): Promise<ToolResult> => {
    try {
      const { listBankAccounts, getReconciliationSummary } = await import('@kivvi/core');
      const db = getDb(context);
      const currency = context.defaultCurrency;

      const accounts = await listBankAccounts(db, context.companyId);

      if (accounts.length === 0) {
        return {
          success: true,
          message: 'No bank accounts configured.',
          data: { accounts: [], count: 0 },
        };
      }

      const accountSummaries = await Promise.all(
        accounts.map(async (account) => {
          const recon = await getReconciliationSummary(db, context.companyId, account.id);
          return {
            id: account.id,
            name: account.name,
            iban: account.iban,
            bankName: account.bankName,
            balance: `${currency} ${new Decimal(account.balance || '0').toFixed(2)}`,
            reconciliation: {
              total: recon.totalTransactions,
              reconciled: recon.reconciled,
              unreconciled: recon.unreconciled,
              unreconciledAmount: `${currency} ${new Decimal(recon.totalUnreconciledAmount).toFixed(2)}`,
            },
          };
        })
      );

      const totalBalance = accounts.reduce(
        (sum, a) => sum.plus(a.balance || '0'),
        new Decimal(0)
      );
      const totalUnreconciled = accountSummaries.reduce(
        (sum, a) => sum + a.reconciliation.unreconciled,
        0
      );

      return {
        success: true,
        message: `${accounts.length} bank account(s) with total balance of ${currency} ${totalBalance.toFixed(2)}.`,
        data: {
          accounts: accountSummaries,
          count: accounts.length,
          totalBalance: `${currency} ${totalBalance.toFixed(2)}`,
          totalUnreconciledTransactions: totalUnreconciled,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get bank summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
};
