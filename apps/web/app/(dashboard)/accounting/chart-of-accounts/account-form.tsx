"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X, Loader2 } from "lucide-react";
import {
  createAccountAction,
  updateAccountAction,
} from "@/app/actions/accounting";
import type { Account } from "@kivvi/database";
import { useTranslations } from "next-intl";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABEL_KEYS,
} from "@/lib/config/accounting";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface AccountFormProps {
  account?: Account;
  parentAccounts: Account[];
}

export function AccountForm({ account, parentAccounts }: AccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("accounting");
  const tc = useTranslations("common");

  const accountTypeOptions = ACCOUNT_TYPES.map((at) => ({
    value: at,
    label: t(ACCOUNT_TYPE_LABEL_KEYS[at]),
  }));

  const isEditing = !!account;

  // Filter out the current account from parent options (can't be its own parent)
  const availableParents = parentAccounts.filter((a) => a.id !== account?.id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get("code") as string,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      parentId: (formData.get("parentId") as string) || null,
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateAccountAction({ accountId: account.id, input: data })
        : await createAccountAction(data);

      if (result.success) {
        router.push("/accounting/chart-of-accounts");
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    });
  }

  function handleCancel() {
    router.push("/accounting/chart-of-accounts");
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">
          {isEditing
            ? `${t("editAccount")}: ${account.code} ${account.name}`
            : t("addAccount")}
        </h2>
        <button
          onClick={handleCancel}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Code */}
          <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium">
              {t("accountCode")}
            </label>
            <FormInput
              id="code"
              name="code"
              type="text"
              required
              maxLength={10}
              defaultValue={account?.code || ""}
              placeholder={t("placeholders.accountCode")}
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              {t("accountName")}
            </label>
            <FormInput
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              defaultValue={account?.name || ""}
              placeholder={t("placeholders.accountName")}
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
              {t("accountType")}
            </label>
            <FormSelect
              id="type"
              name="type"
              required
              defaultValue={account?.type || ""}
            >
              <option value="" disabled>
                {t("accountType")}...
              </option>
              {accountTypeOptions.map((at) => (
                <option key={at.value} value={at.value}>
                  {at.label}
                </option>
              ))}
            </FormSelect>
          </div>

          {/* Parent Account */}
          <div>
            <label
              htmlFor="parentId"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("parentAccount")}
              <span className="ml-1 text-xs text-muted-foreground">
                {tc("optional")}
              </span>
            </label>
            <FormSelect
              id="parentId"
              name="parentId"
              defaultValue={account?.parentId || ""}
            >
              <option value="">{tc("none")}</option>
              {availableParents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-destructive ">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tc("saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? t("editAccount") : t("addAccount")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {tc("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
