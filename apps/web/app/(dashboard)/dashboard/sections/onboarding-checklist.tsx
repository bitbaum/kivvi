"use client";

import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useState, useEffect } from "react";

const DISMISS_KEY = "kivvi-checklist-dismissed";

export interface ChecklistState {
  hasIntake: boolean;
  hasInvoice: boolean;
  hasBankAccount: boolean;
  hasTeamMember: boolean;
  hasShopUrl: boolean;
  companyAgeDays: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  hasIntake,
  hasInvoice,
  hasBankAccount,
  hasTeamMember,
  hasShopUrl,
  companyAgeDays,
}: ChecklistState) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  const items: ChecklistItem[] = [
    {
      id: "intake",
      label: "Ersten Artikel erfassen",
      description: "Nimm deinen ersten gespendeten Artikel auf",
      href: "/intake/quick",
      done: hasIntake,
    },
    {
      id: "invoice",
      label: "Erste Rechnung erstellen",
      description: "Stelle deine erste Rechnung aus",
      href: "/sales/invoices/new",
      done: hasInvoice,
    },
    {
      id: "bank",
      label: "Bankkonto einrichten",
      description: "Verbinde dein IBAN für QR-Rechnungen und Abgleich",
      href: "/banking",
      done: hasBankAccount,
    },
    {
      id: "team",
      label: "Teammitglied einladen",
      description: "Arbeite mit deinem Team zusammen",
      href: "/settings/team",
      done: hasTeamMember,
    },
    {
      id: "shop",
      label: "Shop-URL konfigurieren",
      description: "Richte deine öffentliche Shopseite ein",
      href: "/settings/company",
      done: hasShopUrl,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;

  // Hide if: dismissed, all done, or company is older than 7 days
  if (dismissed || allDone || companyAgeDays > 7) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  const progressPct = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between border-b p-5">
        <div>
          <h2 className="font-semibold">Erste Schritte mit Kivvi</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {completedCount} von {items.length} abgeschlossen
          </p>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Schliessen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.done ? "#" : item.href}
            className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
              item.done ? "cursor-default opacity-60" : "hover:bg-muted/50"
            }`}
            onClick={(e) => item.done && e.preventDefault()}
          >
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            ) : (
              <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${item.done ? "line-through" : ""}`}
              >
                {item.label}
              </p>
              {!item.done && (
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
