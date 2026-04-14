'use client';

import { useState, useCallback } from 'react';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import { cleanHeaders, parseKivitendoLineItems } from '@kivvi/core/src/domain/import-mappings';
import type { ParsedLineItem } from '@kivvi/core/src/domain/import-mappings';
import { repairDocumentLineItemsAction } from '@/app/actions/onboarding';

type EntityType = 'invoice' | 'purchase_invoice';

interface RepairState {
  entityType: EntityType;
  fileName: string;
  itemCount: number;
  docCount: number;
  structuredItems: Record<string, ParsedLineItem[]>;
}

export function RepairImportForm() {
  const t = useTranslations('settings.repair');
  const tc = useTranslations('common');
  const [state, setState] = useState<RepairState | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [result, setResult] = useState<{ updated: number; skipped: number } | null>(null);

  const handleFile = useCallback((entityType: EntityType, file: File) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rawRows = results.data as string[][];
        if (rawRows.length < 2) {
          toast.error(t('csvEmpty'));
          return;
        }

        const headers = cleanHeaders(rawRows[0].map((h) => h || ''));
        const positionenIdx = headers.indexOf('Positionen');
        const buchungsnummerIdx = headers.indexOf('Buchungsnummer');

        if (positionenIdx === -1 || buchungsnummerIdx === -1) {
          toast.error(t('csvMissingColumns'));
          return;
        }

        const structuredItems: Record<string, ParsedLineItem[]> = {};
        let totalItems = 0;

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          const docNumber = row[buchungsnummerIdx]?.trim();
          if (!docNumber) continue;

          const items = parseKivitendoLineItems(row, positionenIdx);
          if (items.length > 0) {
            structuredItems[docNumber] = items;
            totalItems += items.length;
          }
        }

        const docCount = Object.keys(structuredItems).length;
        if (docCount === 0) {
          toast.error(t('noLineItems'));
          return;
        }

        setState({
          entityType,
          fileName: file.name,
          itemCount: totalItems,
          docCount,
          structuredItems,
        });
        setResult(null);
      },
      error: (err) => {
        toast.error(t('csvParseFailed', { message: err.message }));
      },
    });
  }, [t]);

  const handleRepair = async () => {
    if (!state) return;
    setIsRepairing(true);

    const res = await repairDocumentLineItemsAction(state.entityType, state.structuredItems);

    if (res.success && res.data) {
      setResult(res.data);
      toast.success(t('updatedDocuments', { updated: res.data.updated, skipped: res.data.skipped }));
    } else {
      toast.error(res.error || t('repairFailed'));
    }

    setIsRepairing(false);
  };

  return (
    <div className="space-y-6">
      {/* Invoice CSV */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-1 font-semibold">{t('salesInvoicesTitle')}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('salesInvoicesDesc')}
        </p>
        <FileUpload
          label={t('uploadCsv')}
          entityType="invoice"
          onFile={handleFile}
          disabled={isRepairing}
        />
      </div>

      {/* Purchase Invoice CSV */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-1 font-semibold">{t('purchaseInvoicesTitle')}</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {t('purchaseInvoicesDesc')}
        </p>
        <FileUpload
          label={t('uploadCsv')}
          entityType="purchase_invoice"
          onFile={handleFile}
          disabled={isRepairing}
        />
      </div>

      {/* Preview & action */}
      {state && !result && (
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            <span className="font-medium">{state.fileName}</span>
            <span className="text-muted-foreground">
              — {t('documents', { docCount: state.docCount, itemCount: state.itemCount })}
            </span>
          </div>
          <button
            onClick={handleRepair}
            disabled={isRepairing}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isRepairing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('reimportLineItems')}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="font-medium">{t('repairComplete')}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('updatedDocuments', { updated: result.updated, skipped: result.skipped })}
          </p>
          <button
            onClick={() => { setState(null); setResult(null); }}
            className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            {t('repairAnother')}
          </button>
        </div>
      )}
    </div>
  );
}

function FileUpload({
  label,
  entityType,
  onFile,
  disabled,
}: {
  label: string;
  entityType: EntityType;
  onFile: (type: EntityType, file: File) => void;
  disabled: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary hover:bg-primary/5 ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(entityType, file);
        }}
        disabled={disabled}
      />
    </label>
  );
}
