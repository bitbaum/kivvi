import {
  BookOpen,
  MessageSquare,
  Keyboard,
  Mail,
  ExternalLink,
} from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";

export default async function HelpPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("help");
  const tc = await getTranslations("common");

  const shortcuts = [
    { keys: "/", description: tc("shortcuts.focusSearch") },
    { keys: "N", description: tc("shortcuts.createNew") },
    { keys: "Esc", description: tc("shortcuts.closeModals") },
  ];

  const quickLinks = [
    {
      label: t("qrBillStandard"),
      href: "https://www.six-group.com/en/products-services/banking-services/payment-standardization/standards/qr-bill.html",
    },
    {
      label: t("vatRatesLink"),
      href: "https://www.estv.admin.ch/estv/en/home/value-added-tax.html",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">{t("aiAssistant")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("aiAssistantDesc")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">{t("gettingStarted")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("gettingStartedDesc")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="rounded-lg border bg-background p-3 inline-block">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-semibold">{t("support")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("supportDesc")}{" "}
            <a
              href="mailto:support@revamp-it.ch"
              className="text-primary hover:underline"
            >
              support@revamp-it.ch
            </a>
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg border bg-background p-3">
            <Keyboard className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-semibold">{tc("shortcuts.title")}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center gap-3">
              <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border bg-muted px-2 font-mono text-xs">
                {shortcut.keys}
              </kbd>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold mb-3">{t("quickLinks")}</h2>
        <div className="space-y-2">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
