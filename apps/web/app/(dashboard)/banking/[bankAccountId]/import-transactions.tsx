"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  importTransactionsAction,
  parseCamtAction,
  importCamtAction,
  type CamtPreview,
} from "@/app/actions/banking";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";
import { parseCsv, type ParsedTransaction } from "./parse-bank-csv";
import { TransactionPreviewTable } from "./transaction-preview-table";

type FileType = "csv" | "xml";
type ImportResult = { imported: number; skippedDuplicates: number };

export function ImportTransactions({
  bankAccountId,
}: {
  bankAccountId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [csvTransactions, setCsvTransactions] = useState<ParsedTransaction[]>(
    [],
  );
  const [camtPreview, setCamtPreview] = useState<CamtPreview | null>(null);
  const [camtXml, setCamtXml] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("banking");
  const tc = useTranslations("common");
  useFocusTrap(modalRef, isOpen, handleClose);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setCsvTransactions([]);
    setCamtPreview(null);
    setCamtXml(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    const detectedType: FileType = ext === "xml" ? "xml" : "csv";
    setFileType(detectedType);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (detectedType === "xml") {
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
        setError(t("csvParseError"));
        return;
      }
      setCsvTransactions(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("csvParseFailed"));
    }
  }

  function handleXmlFile(xml: string) {
    setCamtXml(xml);
    startTransition(async () => {
      const res = await parseCamtAction(bankAccountId, xml);
      if (res.success && res.data) {
        setCamtPreview(res.data);
      } else {
        setError(res.error || t("camtParseError"));
      }
    });
  }

  function handleImport() {
    setError(null);
    startTransition(async () => {
      if (fileType === "xml" && camtXml) {
        const res = await importCamtAction(bankAccountId, camtXml);
        if (res.success && res.data) {
          setResult({
            imported: res.data.imported,
            skippedDuplicates: res.data.skippedDuplicates,
          });
          setCamtPreview(null);
          setCamtXml(null);
          router.refresh();
        } else {
          setError(res.error || tc("error"));
        }
      } else {
        const res = await importTransactionsAction(
          bankAccountId,
          csvTransactions,
        );
        if (res.success && res.data) {
          setResult({
            imported: res.data.imported,
            skippedDuplicates: res.data.skippedDuplicates,
          });
          setCsvTransactions([]);
          router.refresh();
        } else {
          setError(res.error || tc("error"));
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
    if (fileRef.current) fileRef.current.value = "";
  }

  const hasPreviewData = csvTransactions.length > 0 || camtPreview !== null;
  const previewCount =
    fileType === "xml"
      ? (camtPreview?.totalEntries ?? 0)
      : csvTransactions.length;

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4" />
        {t("importStatement")}
      </Button>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-transactions-title"
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 id="import-transactions-title" className="text-lg font-semibold">
            {t("importStatement")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label={tc("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {result ? (
            <div className="flex flex-col items-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-success" />
              <p className="mt-4 text-lg font-medium">
                {t("importTransactions", { count: result.imported })}
              </p>
              {result.skippedDuplicates > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("skippedDuplicates", { count: result.skippedDuplicates })}
                </p>
              )}
              <Button onClick={handleClose} className="mt-4">
                {t("done")}
              </Button>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">
                  {t("supportedFormats")}
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
                  {t("parsingFile")}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {camtPreview && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {t("statementInfo", {
                      type: camtPreview.messageType,
                      iban: camtPreview.accountIban || "—",
                      count: camtPreview.totalEntries,
                    })}
                  </span>
                </div>
              )}

              {camtPreview && !camtPreview.ibanMatch && (
                <div className="flex items-start gap-2 rounded-lg bg-warning/5 p-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("ibanMismatch", {
                    statementIban: camtPreview.accountIban || "—",
                    accountIban: "—",
                  })}
                </div>
              )}

              {hasPreviewData && fileType && (
                <TransactionPreviewTable
                  fileType={fileType}
                  csvTransactions={csvTransactions}
                  camtPreview={camtPreview}
                  previewCount={previewCount}
                  isPending={isPending}
                  onImport={handleImport}
                  onClose={handleClose}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
