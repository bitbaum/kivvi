'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { importTransactionsAction } from '@/app/actions/banking';

interface ParsedTransaction {
  date: string;
  description: string;
  reference: string;
  amount: string;
  balance: string;
}

export function ImportCsv({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsv(text);
        if (parsed.length === 0) {
          setError('No valid transactions found in CSV. Expected columns: date, description, reference, amount, balance');
          return;
        }
        setTransactions(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const res = await importTransactionsAction(bankAccountId, transactions);
      if (res.success && res.data) {
        setResult(res.data);
        setTransactions([]);
        router.refresh();
      } else {
        setError(res.error || 'Failed to import transactions');
      }
    });
  }

  function handleClose() {
    setIsOpen(false);
    setTransactions([]);
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <Upload className="h-4 w-4" />
        Import CSV
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border bg-card shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Import Transactions from CSV</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {result ? (
            <div className="flex flex-col items-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-green-600" />
              <p className="mt-4 text-lg font-medium">
                Successfully imported {result.imported} transactions
              </p>
              <button
                onClick={handleClose}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a CSV file with the columns: <span className="font-mono text-xs">date, description, reference, amount, balance</span>
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {transactions.length > 0 && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Preview ({transactions.length} transactions)
                    </p>
                    <div className="max-h-64 overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Reference</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                            <th className="px-3 py-2 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {transactions.slice(0, 50).map((txn, i) => {
                            const amt = parseFloat(txn.amount);
                            return (
                              <tr key={i} className="hover:bg-muted/50">
                                <td className="whitespace-nowrap px-3 py-2">{txn.date}</td>
                                <td className="max-w-[200px] truncate px-3 py-2">{txn.description || '-'}</td>
                                <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">{txn.reference || '-'}</td>
                                <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${amt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {txn.amount}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-right">{txn.balance || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {transactions.length > 50 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          ...and {transactions.length - 50} more
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleImport}
                      disabled={isPending}
                      className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending
                        ? 'Importing...'
                        : `Import ${transactions.length} Transactions`}
                    </button>
                    <button
                      onClick={handleClose}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CSV PARSER
// ============================================================================

function parseCsv(text: string): ParsedTransaction[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

  const dateIdx = header.findIndex((h) => h === 'date' || h === 'datum');
  const descIdx = header.findIndex((h) => h === 'description' || h === 'beschreibung' || h === 'text');
  const refIdx = header.findIndex((h) => h === 'reference' || h === 'referenz' || h === 'ref');
  const amountIdx = header.findIndex((h) => h === 'amount' || h === 'betrag');
  const balanceIdx = header.findIndex((h) => h === 'balance' || h === 'saldo');

  if (dateIdx === -1 || amountIdx === -1) {
    throw new Error('CSV must contain at least "date" and "amount" columns');
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const date = cols[dateIdx]?.trim();
    const amount = cols[amountIdx]?.trim().replace(/['\s]/g, '');

    if (!date || !amount) continue;

    transactions.push({
      date,
      description: descIdx >= 0 ? cols[descIdx]?.trim() || '' : '',
      reference: refIdx >= 0 ? cols[refIdx]?.trim() || '' : '',
      amount,
      balance: balanceIdx >= 0 ? cols[balanceIdx]?.trim().replace(/['\s]/g, '') || '' : '',
    });
  }

  return transactions;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === ';') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
