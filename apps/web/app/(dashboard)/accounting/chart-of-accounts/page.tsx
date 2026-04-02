import Link from "next/link";
import { Plus, Search, BookOpen, ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { listAccounts } from "@kivvi/core";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_STYLES,
  ACCOUNT_TYPE_LABEL_KEYS,
} from "@/lib/config/accounting";
import { StatusBadge } from "@/components/status-badge";
import { SeedButton } from "./seed-button";
import { AccountForm } from "./account-form";
import { ToggleButton } from "./toggle-button";
import { getTranslations } from "next-intl/server";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    search?: string;
    add?: string;
    edit?: string;
  }>;
}

export default async function ChartOfAccountsPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("accounting");
  const tc = await getTranslations("common");

  const typeLabels = Object.fromEntries(
    ACCOUNT_TYPES.map((at) => [at, t(ACCOUNT_TYPE_LABEL_KEYS[at])]),
  ) as Record<string, string>;

  const typeFilterOptions = [
    { label: tc("all"), value: "" },
    ...ACCOUNT_TYPES.map((at) => ({
      label: t(ACCOUNT_TYPE_LABEL_KEYS[at]),
      value: at,
    })),
  ];

  const params = await searchParams;
  const typeFilter = params.type;
  const search = params.search;
  const showAddForm = params.add === "1";
  const editAccountId = params.edit;

  const accounts = await listAccounts(db, session.user.companyId, {
    type: (typeFilter || undefined) as
      | import("@kivvi/database").AccountType
      | undefined,
    search: search || undefined,
  });

  const allAccounts = await listAccounts(db, session.user.companyId);
  const isEmpty = allAccounts.length === 0;

  // Build a lookup of parent accounts for display
  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));
  const editAccount = editAccountId ? accountMap.get(editAccountId) : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/accounting"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t("chartOfAccounts")}</h1>
            <p className="text-muted-foreground">
              {isEmpty
                ? t("noAccounts")
                : t("accountsConfigured", { count: allAccounts.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEmpty && <SeedButton />}
          <Link
            href={
              showAddForm
                ? "/accounting/chart-of-accounts"
                : "/accounting/chart-of-accounts?add=1"
            }
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("addAccount")}
          </Link>
        </div>
      </div>

      {/* Add/Edit Account Form */}
      {(showAddForm || editAccount) && (
        <AccountForm
          account={editAccount || undefined}
          parentAccounts={allAccounts}
        />
      )}

      {/* Empty state with seed option */}
      {isEmpty && !showAddForm ? (
        <div className="rounded-xl border bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">{t("noAccounts")}</h3>
            <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
              {t("seedConfirm")}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <SeedButton />
              <Link
                href="/accounting/chart-of-accounts?add=1"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("addAccount")}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <form
              className="relative flex-1 sm:max-w-sm"
              action="/accounting/chart-of-accounts"
              method="GET"
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="search"
                placeholder={t("searchAccounts")}
                defaultValue={search}
                className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {typeFilter && (
                <input type="hidden" name="type" value={typeFilter} />
              )}
            </form>

            {/* Type filter */}
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
              {typeFilterOptions.map((opt) => {
                const isActive = (typeFilter || "") === opt.value;
                const filterParams = new URLSearchParams();
                if (search) filterParams.set("search", search);
                if (opt.value) filterParams.set("type", opt.value);
                const href = `/accounting/chart-of-accounts${filterParams.toString() ? `?${filterParams.toString()}` : ""}`;

                return (
                  <Link
                    key={opt.value}
                    href={href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card">
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">{tc("noResults")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("searchAccounts")}
                </p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[80px_1fr_auto_auto_auto] gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <div>{t("accountCode")}</div>
                  <div>{tc("name")}</div>
                  <div>{tc("type")}</div>
                  <div className="text-center">{tc("status")}</div>
                  <div className="text-right">{tc("edit")}</div>
                </div>

                {/* Table rows */}
                <div className="divide-y">
                  {accounts.map((account) => {
                    const parent = account.parentId
                      ? accountMap.get(account.parentId)
                      : null;
                    const isEditing = editAccountId === account.id;

                    return (
                      <div
                        key={account.id}
                        className={cn(
                          "grid grid-cols-[80px_1fr_auto_auto_auto] gap-4 px-6 py-4 transition-colors hover:bg-muted/50",
                          !account.isActive && "opacity-60",
                        )}
                      >
                        <div className="font-mono text-sm font-medium">
                          {account.code}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          {parent && (
                            <p className="text-xs text-muted-foreground">
                              Parent: {parent.code} {parent.name}
                            </p>
                          )}
                        </div>
                        <div>
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                              ACCOUNT_TYPE_STYLES[account.type] || "",
                            )}
                          >
                            {typeLabels[account.type] || account.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-center">
                          <StatusBadge
                            variant={account.isActive ? "active" : "inactive"}
                            label={
                              account.isActive ? tc("active") : tc("inactive")
                            }
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <ToggleButton
                            accountId={account.id}
                            isActive={account.isActive ?? true}
                          />
                          <Link
                            href={
                              isEditing
                                ? `/accounting/chart-of-accounts${typeFilter ? `?type=${typeFilter}` : ""}${search ? `${typeFilter ? "&" : "?"}search=${search}` : ""}`
                                : `/accounting/chart-of-accounts?edit=${account.id}${typeFilter ? `&type=${typeFilter}` : ""}${search ? `&search=${search}` : ""}`
                            }
                            className="rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                          >
                            {isEditing ? tc("cancel") : tc("edit")}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {accounts.length} account
                    {accounts.length !== 1 ? "s" : ""}
                    {typeFilter
                      ? ` of type "${typeLabels[typeFilter] || typeFilter}"`
                      : ""}
                    {search ? ` matching "${search}"` : ""}
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
