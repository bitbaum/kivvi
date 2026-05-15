"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Upload, UserPlus, PackagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "kivvi-welcome-dismissed";

interface WelcomeSectionProps {
  companyName: string;
  contactCount: number;
  documentCount: number;
}

export function WelcomeSection({
  companyName,
  contactCount,
  documentCount,
}: WelcomeSectionProps) {
  const t = useTranslations("dashboard.welcome");
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  // Only show for brand new companies with no data
  if (dismissed || contactCount > 0 || documentCount > 0) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  }

  const actions = [
    {
      href: "/intake/quick",
      icon: <PackagePlus className="h-7 w-7" />,
      label: t("quickIntake"),
      description: t("quickIntakeDesc"),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      href: "/onboarding",
      icon: <Upload className="h-7 w-7" />,
      label: t("importData"),
      description: t("importDataDesc"),
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      href: "/contacts/new",
      icon: <UserPlus className="h-7 w-7" />,
      label: t("addContact"),
      description: t("addContactDesc"),
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b p-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {t("title", { company: companyName })}
          </h2>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.bgColor}`}
            >
              <div className={action.color}>{action.icon}</div>
            </div>
            <div>
              <p className="font-semibold">{action.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <div className="border-t px-6 py-3">
        <button
          onClick={handleDismiss}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
