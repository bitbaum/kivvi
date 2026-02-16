'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Papa from 'papaparse';
import { cleanHeaders } from '@kivvi/core/src/domain/import-mappings';

interface CsvUploaderProps {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void;
  label?: string;
  accept?: string;
}

export function CsvUploader({ onParsed, label = 'Upload CSV', accept = '.csv' }: CsvUploaderProps) {
  const t = useTranslations('onboarding');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((file: File) => {
    setError('');
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError(`Parse error: ${results.errors[0].message}`);
          return;
        }

        const rawHeaders = results.meta.fields || [];
        const headers = cleanHeaders(rawHeaders);
        const rows = results.data as Record<string, string>[];

        // Remap rows to use cleaned headers
        const cleanedRows = rows.map((row) => {
          const cleaned: Record<string, string> = {};
          rawHeaders.forEach((rawH, i) => {
            cleaned[headers[i]] = row[rawH] || '';
          });
          return cleaned;
        });

        onParsed(headers, cleanedRows);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleClear = () => {
    setFileName(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {!fileName ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
          }`}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          <span className="mt-1 text-xs text-muted-foreground">
            {t('dragAndDrop')}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 truncate text-sm">{fileName}</span>
          <button
            onClick={handleClear}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
