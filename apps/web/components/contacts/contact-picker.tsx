"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { searchContactsAction } from "@/app/actions/contacts";
import { QuickCreateContactModal } from "./quick-create-modal";

interface ContactPickerProps {
  /** Currently selected contact ID */
  value: string | null;
  /** Display text for the search input (contact name) */
  displayValue: string;
  /** Called when a contact is selected */
  onChange: (
    contactId: string | null,
    contactName: string,
    paymentTermsDays?: number | null,
  ) => void;
  /** Filter label: 'customer' or 'vendor' */
  contactType?: "customer" | "vendor";
  /** Show the quick-create modal option */
  allowQuickCreate?: boolean;
  /** Override the built-in label text */
  label?: string;
}

interface ContactResult {
  id: string;
  name: string;
  contactNumber: string | null;
  email?: string | null;
  paymentTermsDays?: number | null;
}

export function ContactPicker({
  value,
  displayValue,
  onChange,
  contactType = "customer",
  allowQuickCreate = true,
  label,
}: ContactPickerProps) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");

  const [search, setSearch] = useState(displayValue);
  const [results, setResults] = useState<ContactResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external display value changes
  useEffect(() => {
    setSearch(displayValue);
  }, [displayValue]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showDropdown]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    // Debounce search to avoid excessive server requests
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await searchContactsAction(query);
      if (result.success && result.data) {
        setResults(result.data);
        setShowDropdown(true);
      } else {
        setResults([]);
      }
    }, 200);
  }, []);

  const selectContact = (contact: ContactResult) => {
    onChange(contact.id, contact.name, contact.paymentTermsDays);
    setSearch(contact.name);
    setShowDropdown(false);
  };

  const clearContact = () => {
    onChange(null, "");
    setSearch("");
    setResults([]);
  };

  const handleQuickCreateSuccess = (contact: { id: string; name: string }) => {
    onChange(contact.id, contact.name);
    setSearch(contact.name);
    setShowDropdown(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <label
          htmlFor="contact-picker-search"
          className="block text-sm font-medium"
        >
          {label ?? (contactType === "vendor" ? t("vendor") : t("customer"))}
        </label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="contact-picker-search"
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={`${tc("search")}...`}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {value && (
            <button
              type="button"
              onClick={clearContact}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              {t("clear")}
            </button>
          )}
        </div>
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg">
            {results.length > 0 ? (
              <>
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectContact(c)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="font-medium">{c.name}</span>
                    {c.contactNumber && (
                      <span className="ml-2 text-muted-foreground">
                        {c.contactNumber}
                      </span>
                    )}
                  </button>
                ))}
              </>
            ) : allowQuickCreate && search.length >= 2 ? (
              <button
                type="button"
                onClick={() => {
                  setShowQuickCreate(true);
                  setShowDropdown(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-muted rounded-lg"
              >
                <UserPlus className="h-4 w-4 text-primary" />
                <span>
                  {tc("create")}{" "}
                  <span className="font-medium">&quot;{search}&quot;</span>
                </span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {allowQuickCreate && (
        <QuickCreateContactModal
          isOpen={showQuickCreate}
          onClose={() => setShowQuickCreate(false)}
          onSuccess={handleQuickCreateSuccess}
          initialName={search}
          contactType={contactType}
        />
      )}
    </>
  );
}
