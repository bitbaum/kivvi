"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Link2, Unlink, Search, FileText } from "lucide-react";
import {
  reconcileTransactionAction,
  unreconcileTransactionAction,
} from "@/app/actions/banking";
import { useTranslations } from "next-intl";

interface MatchedDocument {
  id: string;
  number: string;
  type: string;
  total: string;
  contactName: string | null;
}

interface SearchResult {
  id: string;
  number: string;
  type: string;
  total: string;
  contact?: { name: string } | null;
}

export function ReconcileButton({
  transactionId,
  isReconciled,
  matchedDocument,
}: {
  transactionId: string;
  isReconciled: boolean;
  matchedDocument?: MatchedDocument | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("banking");
  const tc = useTranslations("common");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Search documents when query changes
  useEffect(() => {
    if (!isOpen || search.length < 2) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/documents/search?q=${encodeURIComponent(search)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.data || []);
        }
      } catch {
        // Aborted or failed - ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, isOpen]);

  function handleReconcile(documentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await reconcileTransactionAction({
        transactionId,
        documentId,
      });
      if (res.success) {
        setIsOpen(false);
        setSearch("");
        router.refresh();
      } else {
        setError(res.error || tc("error"));
      }
    });
  }

  function handleUnreconcile() {
    setError(null);
    startTransition(async () => {
      const res = await unreconcileTransactionAction(transactionId);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || tc("error"));
      }
    });
  }

  if (isReconciled) {
    return (
      <div>
        <button
          onClick={handleUnreconcile}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 min-h-[44px]"
          title={t("unreconcile")}
        >
          <Unlink className="h-3 w-3" />
          {isPending ? "..." : t("unlink")}
        </button>
        {error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 min-h-[44px]"
      >
        <Link2 className="h-3 w-3" />
        {t("match")}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border bg-card shadow-lg">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchInvoices")}
                autoFocus
                className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto border-t">
            {isSearching ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                {t("searching")}
              </p>
            ) : search.length < 2 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                {t("typeAtLeast")}
              </p>
            ) : results.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                {t("noDocumentsFound")}
              </p>
            ) : (
              <div className="divide-y">
                {results.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleReconcile(doc.id)}
                    disabled={isPending}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {doc.number}
                        </span>
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          {doc.type}
                        </span>
                      </div>
                      {doc.contact?.name && (
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.contact.name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      {doc.total}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="border-t p-2">
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
