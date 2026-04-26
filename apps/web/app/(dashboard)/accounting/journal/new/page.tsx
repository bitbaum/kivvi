"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { FormInput } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { AccountPicker } from "./account-picker";
import { useJournalEntryForm } from "./use-journal-entry-form";

export default function NewJournalEntryPage() {
  const {
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
    totalDebits,
    totalCredits,
    isBalanced,
    hasAmounts,
    addLine,
    removeLine,
    updateLine,
    handleSubmit,
    t,
    tc,
  } = useJournalEntryForm();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/accounting/journal"
          className="min-h-[44px] min-w-[44px] rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t("newJournalEntry")}</h1>
          <p className="text-muted-foreground">{t("journalEntry")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entry details */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">
                  {tc("date")}
                </label>
                <FormInput
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  {t("reference")}
                </label>
                <FormInput
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t("placeholders.reference")}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">
                {tc("description")}
              </label>
              <FormInput
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("placeholders.description")}
                className="mt-1"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">{t("journalEntry")}</h2>
              <Button type="button" variant="link" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4" />
                {t("addLine")}
              </Button>
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
                        <label className="block text-sm text-muted-foreground">
                          {t("account")}
                        </label>
                        <div className="relative mt-1">
                          <AccountPicker
                            accounts={accounts}
                            loading={accountsLoading}
                            selectedAccountId={line.accountId}
                            onSelect={(account) =>
                              updateLine(line.id, "accountId", account.id)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`debit-${line.id}`}
                            className="block text-sm text-muted-foreground"
                          >
                            {t("debit")}
                          </label>
                          <FormInput
                            id={`debit-${line.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit}
                            onChange={(e) => {
                              updateLine(line.id, "debit", e.target.value);
                              if (e.target.value) {
                                updateLine(line.id, "credit", "");
                              }
                            }}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`credit-${line.id}`}
                            className="block text-sm text-muted-foreground"
                          >
                            {t("credit")}
                          </label>
                          <FormInput
                            id={`credit-${line.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit}
                            onChange={(e) => {
                              updateLine(line.id, "credit", e.target.value);
                              if (e.target.value) {
                                updateLine(line.id, "debit", "");
                              }
                            }}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`description-${line.id}`}
                            className="block text-sm text-muted-foreground"
                          >
                            {tc("description")}
                          </label>
                          <FormInput
                            id={`description-${line.id}`}
                            type="text"
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, "description", e.target.value)
                            }
                            placeholder={t("placeholders.optional")}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                    {lines.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        className="mt-2 text-muted-foreground hover:bg-destructive/5 hover:text-destructive dark:hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <h2 className="mb-4 font-semibold">{tc("total")}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("debit")}</span>
                <span className="font-medium">
                  {formatCurrency(totalDebits.toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("credit")}</span>
                <span className="font-medium">
                  {formatCurrency(totalCredits.toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">{t("difference")}</span>
                <span
                  className={`font-bold ${
                    hasAmounts && !isBalanced
                      ? "text-destructive"
                      : hasAmounts && isBalanced
                        ? "text-success"
                        : ""
                  }`}
                >
                  {formatCurrency(
                    totalDebits.minus(totalCredits).abs().toFixed(2),
                  )}
                </span>
              </div>
            </div>

            {hasAmounts && !isBalanced && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/5"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 text-destructive" />
                <p className="text-sm text-destructive">
                  {t("entryMustBalance")}
                </p>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !isBalanced || !hasAmounts}
              className="mt-6 w-full"
              size="lg"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? tc("creating") : t("createEntry")}
            </Button>

            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("manualEntryNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
