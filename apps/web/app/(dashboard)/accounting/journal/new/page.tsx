'use client';

import Decimal from 'decimal.js';
import { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Search, AlertCircle } from 'lucide-react';
import { createJournalEntryAction } from '@/app/actions/accounting';
import { useTranslations } from 'next-intl';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface JournalLineItem {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

function emptyLine(): JournalLineItem {
  return {
    id: crypto.randomUUID(),
    accountId: '',
    debit: '',
    credit: '',
    description: '',
  };
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('accounting');
  const tc = useTranslations('common');

  // Accounts data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLineItem[]>([emptyLine(), emptyLine()]);

  // Account search state per line (for the searchable select)
  const [activeAccountPicker, setActiveAccountPicker] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState('');

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const res = await fetch('/api/accounts');
        if (res.ok) {
          const data = await res.json();
          setAccounts(data);
        }
      } catch {
        // Silently fail - accounts will just be empty
      } finally {
        setAccountsLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  // Filtered accounts for the picker
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts;
    const query = accountSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(query) ||
        a.name.toLowerCase().includes(query)
    );
  }, [accounts, accountSearch]);

  // Line item management
  const addLine = () => setLines([...lines, emptyLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof JournalLineItem, value: string) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const selectAccount = (lineId: string, account: Account) => {
    updateLine(lineId, 'accountId', account.id);
    setActiveAccountPicker(null);
    setAccountSearch('');
  };

  // Resolve account name by ID
  const getAccountDisplay = (accountId: string): string => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.code} - ${account.name}` : '';
  };

  // Totals
  const totalDebits = lines.reduce((sum, l) => sum.plus(l.debit ? new Decimal(l.debit) : new Decimal(0)), new Decimal(0));
  const totalCredits = lines.reduce((sum, l) => sum.plus(l.credit ? new Decimal(l.credit) : new Decimal(0)), new Decimal(0));
  const isBalanced = totalDebits.minus(totalCredits).abs().lessThan(0.005);
  const hasAmounts = totalDebits.greaterThan(0) || totalCredits.greaterThan(0);

  // Submit
  async function handleSubmit() {
    setError(null);

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    const validLines = lines.filter((l) => l.accountId && (l.debit || l.credit));
    if (validLines.length < 2) {
      setError('At least 2 lines with accounts and amounts are required');
      return;
    }

    if (!isBalanced) {
      setError(
        `Debits (${totalDebits.toFixed(2)}) must equal credits (${totalCredits.toFixed(2)})`
      );
      return;
    }

    startTransition(async () => {
      const result = await createJournalEntryAction({
        date,
        reference: reference || null,
        description,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit || null,
          credit: l.credit || null,
          description: l.description || null,
        })),
      });

      if (result.success && result.data) {
        router.push(`/accounting/journal/${(result.data as { id: string }).id}`);
      } else {
        setError(result.error || 'Failed to create journal entry');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounting/journal" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('newJournalEntry')}</h1>
          <p className="text-muted-foreground">{t('journalEntry')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entry details */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">{tc('date')}</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">{t('reference')}</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional reference..."
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">{tc('description')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this entry for?"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">{t('journalEntry')}</h2>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                {t('addLine')}
              </button>
            </div>

            <div className="divide-y">
              {lines.map((line, index) => (
                <div key={line.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-2.5 text-sm text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      {/* Account picker */}
                      <div className="relative">
                        <label className="block text-xs text-muted-foreground">
                          {t('account')}
                        </label>
                        <div className="relative mt-1">
                          {activeAccountPicker === line.id ? (
                            <>
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <input
                                type="text"
                                autoFocus
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                onBlur={() => {
                                  // Delay to allow click on dropdown item
                                  setTimeout(() => {
                                    setActiveAccountPicker(null);
                                    setAccountSearch('');
                                  }, 200);
                                }}
                                placeholder={t('searchAccounts')}
                                className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary"
                              />
                              {filteredAccounts.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-card shadow-lg">
                                  {filteredAccounts.map((account) => (
                                    <button
                                      key={account.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => selectAccount(line.id, account)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                                    >
                                      <span className="font-mono text-muted-foreground">
                                        {account.code}
                                      </span>
                                      {' - '}
                                      <span className="font-medium">{account.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveAccountPicker(line.id);
                                setAccountSearch('');
                              }}
                              className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus:ring-2 focus:ring-primary"
                            >
                              {line.accountId ? (
                                <span>{getAccountDisplay(line.accountId)}</span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {accountsLoading ? tc('loading') : t('account') + '...'}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground">
                            {t('debit')}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit}
                            onChange={(e) => {
                              updateLine(line.id, 'debit', e.target.value);
                              // Clear credit if debit is set
                              if (e.target.value) {
                                updateLine(line.id, 'credit', '');
                              }
                            }}
                            placeholder="0.00"
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">
                            {t('credit')}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit}
                            onChange={(e) => {
                              updateLine(line.id, 'credit', e.target.value);
                              // Clear debit if credit is set
                              if (e.target.value) {
                                updateLine(line.id, 'debit', '');
                              }
                            }}
                            placeholder="0.00"
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground">
                            {tc('description')}
                          </label>
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, 'description', e.target.value)
                            }
                            placeholder="Optional..."
                            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="mt-2 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="sticky top-6 rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">{tc('total')}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('debit')}</span>
                <span className="font-medium">CHF {totalDebits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('credit')}</span>
                <span className="font-medium">CHF {totalCredits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">{t('difference')}</span>
                <span
                  className={`font-bold ${
                    hasAmounts && !isBalanced
                      ? 'text-red-600 dark:text-red-400'
                      : hasAmounts && isBalanced
                        ? 'text-green-600 dark:text-green-400'
                        : ''
                  }`}
                >
                  CHF {totalDebits.minus(totalCredits).abs().toFixed(2)}
                </span>
              </div>
            </div>

            {hasAmounts && !isBalanced && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('entryMustBalance')}
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !isBalanced || !hasAmounts}
              className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? tc('creating') : t('createEntry')}
            </button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              Entry will be created as a manual journal entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
