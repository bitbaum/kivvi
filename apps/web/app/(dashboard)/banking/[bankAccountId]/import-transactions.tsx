'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileSpreadsheet, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import {
  importTransactionsAction,
  parseCamtAction,
  importCamtAction,
  type CamtPreview,
} from '@/app/actions/banking';
import { useTranslations } from 'next-intl';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface ParsedTransaction {
  date: string;
  description: string;
  reference: string;
  amount: string;
  balance: string;
}

type FileType = 'csv' | 'xml';
type ImportResult = { imported: number; skippedDuplicates: number };

export function ImportTransactions({ bankAccountId }: { bankAccountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  // CSV state
  const [csvTransactions, setCsvTransactions] = useState<ParsedTransaction[]>([]);
  // CAMT state
  const [camtPreview, setCamtPreview] = useState<CamtPreview | null>(null);
  const [camtXml, setCamtXml] = useState<string | null>(null);
  // Shared state
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('banking');
  const tc = useTranslations('common');
  useFocusTrap(modalRef, isOpen);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setCsvTransactions([]);
    setCamtPreview(null);
    setCamtXml(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    const detectedType: FileType = ext === 'xml' ? 'xml' : 'csv';
    setFileType(detectedType);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (detectedType === 'xml') {
        handleXmlFile(text);
      } else {
        handleCsvFile(text);
      }
    };
    reader.readAsText(file);
  }

  function handleCsvFile(text: string) {
    try {
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError(t('csvParseError'));
        return;
      }
      setCsvTransactions(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('csvParseFailed'));
    }
  }

  function handleXmlFile(xml: string) {
    setCamtXml(xml);
    startTransition(async () => {
      const res = await parseCamtAction(bankAccountId, xml);
      if (res.success && res.data) {
        setCamtPreview(res.data);
      } else {
        setError(res.error || t('camtParseError'));
      }
    });
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      if (fileType === 'xml' && camtXml) {
        const res = await importCamtAction(bankAccountId, camtXml);
        if (res.success && res.data) {
          setResult({ imported: res.data.imported, skippedDuplicates: res.data.skippedDuplicates });
          setCamtPreview(null);
          setCamtXml(null);
          router.refresh();
        } else {
          setError(res.error || tc('error'));
        }
      } else {
        const res = await importTransactionsAction(bankAccountId, csvTransactions);
        if (res.success && res.data) {
          setResult({ imported: res.data.imported, skippedDuplicates: res.data.skippedDuplicates });
          setCsvTransactions([]);
          router.refresh();
        } else {
          setError(res.error || tc('error'));
        }
      }
    });
  }

  function handleClose() {
    setIsOpen(false);
    setCsvTransactions([]);
    setCamtPreview(null);
    setCamtXml(null);
    setFileType(null);
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const hasPreviewData = csvTransactions.length > 0 || camtPreview !== null;
  const previewCount = fileType === 'xml' ? (camtPreview?.totalEntries ?? 0) : csvTransactions.length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <Upload className="h-4 w-4" />
        {t('importStatement')}
      </button>
    );
  }

  return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-xl border bg-card shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{t('importStatement')}</h2>
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
                {t('importTransactions', { count: result.imported })}
              </p>
              {result.skippedDuplicates > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('skippedDuplicates', { count: result.skippedDuplicates })}
                </p>
              )}
              <button
                onClick={handleClose}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('done')}
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {t('supportedFormats')}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xml"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>

              {isPending && !hasPreviewData && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  {t('parsingFile')}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* CAMT statement info */}
              {camtPreview && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {t('statementInfo', {
                      type: camtPreview.messageType,
                      iban: camtPreview.accountIban || '—',
                      count: camtPreview.totalEntries,
                    })}
                  </span>
                </div>
              )}

              {/* IBAN mismatch warning */}
              {camtPreview && !camtPreview.ibanMatch && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('ibanMismatch', {
                    statementIban: camtPreview.accountIban || '—',
                    accountIban: '—',
                  })}
                </div>
              )}

              {/* Preview table */}
              {hasPreviewData && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      {t('preview', { count: previewCount })}
                    </p>
                    <div className="max-h-64 overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted">
                          <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2">{tc('date')}</th>
                            <th className="px-3 py-2">{tc('description')}</th>
                            {fileType === 'xml' && <th className="px-3 py-2">{t('debtor')}</th>}
                            {fileType === 'xml' && <th className="px-3 py-2">{t('creditor')}</th>}
                            {fileType === 'csv' && <th className="px-3 py-2">{t('reference')}</th>}
                            <th className="px-3 py-2 text-right">{tc('amount')}</th>
                            {fileType === 'csv' && <th className="px-3 py-2 text-right">{t('balance')}</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {fileType === 'xml' && camtPreview
                            ? camtPreview.entries.slice(0, 50).map((entry, i) => {
                                const amt = Number(entry.amount);
                                return (
                                  <tr key={i} className="hover:bg-muted/50">
                                    <td className="whitespace-nowrap px-3 py-2">{entry.bookingDate}</td>
                                    <td className="max-w-[180px] truncate px-3 py-2">{entry.description || '-'}</td>
                                    <td className="max-w-[120px] truncate px-3 py-2">{entry.debtorName || '-'}</td>
                                    <td className="max-w-[120px] truncate px-3 py-2">{entry.creditorName || '-'}</td>
                                    <td className={`whitespace-nowrap px-3 py-2 text-right font-medium ${amt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {entry.amount}
                                    </td>
                                  </tr>
                                );
                              })
                            : csvTransactions.slice(0, 50).map((txn, i) => {
                                const amt = Number(txn.amount);
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
                      {previewCount > 50 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {t('andMore', { count: previewCount - 50 })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balances for CAMT */}
                  {camtPreview?.openingBalance && camtPreview?.closingBalance && (
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('openingBalance')}: </span>
                        <span className="font-medium">
                          {camtPreview.openingBalance.amount} {camtPreview.openingBalance.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('closingBalance')}: </span>
                        <span className="font-medium">
                          {camtPreview.closingBalance.amount} {camtPreview.closingBalance.currency}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleImport}
                      disabled={isPending}
                      className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending
                        ? t('importing')
                        : t('importTransactions', { count: previewCount })}
                    </button>
                    <button
                      onClick={handleClose}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      {tc('cancel')}
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
