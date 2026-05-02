import Decimal from "decimal.js";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createJournalEntryAction,
  listAccountsAction,
} from "@/app/actions/accounting";
import type { Account } from "./account-picker";

export interface JournalLineItem {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

function emptyLine(): JournalLineItem {
  return {
    id: crypto.randomUUID(),
    accountId: "",
    debit: "",
    credit: "",
    description: "",
  };
}

export function useJournalEntryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("accounting");
  const tc = useTranslations("common");

  // Accounts data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLineItem[]>([
    emptyLine(),
    emptyLine(),
  ]);

  // Fetch accounts on mount
  useEffect(() => {
    listAccountsAction({ isActive: true })
      .then((result) => {
        if (result.success) setAccounts(result.data as Account[]);
      })
      .catch(() => {
        // Silently fail — accounts will just be empty
      })
      .finally(() => setAccountsLoading(false));
  }, []);

  // Line item management
  const addLine = () => setLines([...lines, emptyLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (
    id: string,
    field: keyof JournalLineItem,
    value: string,
  ) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  // Totals
  const totalDebits = lines.reduce(
    (sum, l) => sum.plus(l.debit ? new Decimal(l.debit) : new Decimal(0)),
    new Decimal(0),
  );
  const totalCredits = lines.reduce(
    (sum, l) => sum.plus(l.credit ? new Decimal(l.credit) : new Decimal(0)),
    new Decimal(0),
  );
  const isBalanced = totalDebits.minus(totalCredits).abs().lessThan(0.005);
  const hasAmounts = totalDebits.greaterThan(0) || totalCredits.greaterThan(0);

  // Submit
  async function handleSubmit() {
    setError(null);

    if (!description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }

    const validLines = lines.filter(
      (l) => l.accountId && (l.debit || l.credit),
    );
    if (validLines.length < 2) {
      setError(t("minTwoLines"));
      return;
    }

    if (!isBalanced) {
      setError(t("mustBalance"));
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
        router.push(
          `/accounting/journal/${(result.data as { id: string }).id}`,
        );
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  return {
    // State
    accounts,
    accountsLoading,
    date,
    setDate,
    reference,
    setReference,
    description,
    setDescription,
    lines,
    error,
    isPending,
    // Computed
    totalDebits,
    totalCredits,
    isBalanced,
    hasAmounts,
    // Actions
    addLine,
    removeLine,
    updateLine,
    handleSubmit,
    // Translations
    t,
    tc,
  };
}
