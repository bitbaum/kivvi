"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";

export interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface AccountPickerProps {
  accounts: Account[];
  loading: boolean;
  selectedAccountId: string;
  onSelect: (account: Account) => void;
}

export function AccountPicker({
  accounts,
  loading,
  selectedAccountId,
  onSelect,
}: AccountPickerProps) {
  const t = useTranslations("accounting");
  const tc = useTranslations("common");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  if (isOpen) {
    return (
      <>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <FormInput
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              setSearch("");
            }, 200);
          }}
          placeholder={t("searchAccounts")}
          className="pl-10 pr-4"
        />
        {filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-card shadow-lg">
            {filtered.map((account) => (
              <button
                key={account.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(account);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="font-mono text-muted-foreground">
                  {account.code}
                </span>
                {" - "}
                <span className="font-medium">{account.name}</span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsOpen(true);
        setSearch("");
      }}
      className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus:ring-2 focus:ring-ring"
    >
      {selectedAccountId && selectedAccount ? (
        <span>
          {selectedAccount.code} - {selectedAccount.name}
        </span>
      ) : (
        <span className="text-muted-foreground">
          {loading ? tc("loading") : t("account") + "..."}
        </span>
      )}
    </button>
  );
}
