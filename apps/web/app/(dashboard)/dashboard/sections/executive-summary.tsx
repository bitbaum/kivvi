import { getExecutiveSummary } from "@kivvi/core/src/domain/dashboard";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";

export async function ExecutiveSummary({ sinceDate }: { sinceDate?: Date }) {
  const session = await getSessionOrRedirect();
  const companyId = session.user.companyId;
  const t = await getTranslations("dashboard");

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("greeting.morning")
      : hour < 18
        ? t("greeting.afternoon")
        : t("greeting.evening");

  let summary;
  try {
    summary = await getExecutiveSummary(db, companyId, sinceDate);
  } catch {
    // Fallback to simple greeting if summary fails
    return (
      <div id="main-content">
        <h1 className="text-3xl font-bold">{greeting}</h1>
        <p className="text-muted-foreground">{t("hereIsOverview")}</p>
      </div>
    );
  }

  // Build a single narrative sentence from the most important highlights
  const narrativeParts: string[] = [];
  for (const highlight of summary.highlights) {
    const { key, params } = highlight;
    const formattedParams: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === "amount") {
        formattedParams[k] = formatCurrency(v as number);
      } else {
        formattedParams[k] = v;
      }
    }
    // Only include the actionable highlights (outstanding, overdue), not margin
    if (key === "summary.outstanding" || key === "summary.overdue") {
      narrativeParts.push(t(key, formattedParams));
    }
  }

  // Build the narrative: greeting + what matters
  const narrative =
    narrativeParts.length > 0
      ? narrativeParts.join(" ")
      : t("narrative.allGood");

  const sinceDateLabel = sinceDate
    ? new Date(sinceDate).toLocaleDateString(DEFAULT_LOCALE)
    : null;

  return (
    <div id="main-content" className="space-y-1">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{greeting}</h1>
        {sinceDateLabel && (
          <span className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {t("sinceDate", { date: sinceDateLabel })}
          </span>
        )}
      </div>
      <p className="text-lg text-muted-foreground leading-relaxed">
        {narrative}
      </p>
    </div>
  );
}
