import { getDashboardStats } from "@kivvi/core/src/domain/dashboard";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { logger } from "@/lib/logger";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Wallet,
  AlertTriangle,
} from "lucide-react";

export async function SmartStats({ sinceDate }: { sinceDate?: Date }) {
  const session = await getSessionOrRedirect();
  const companyId = session.user.companyId;
  const t = await getTranslations("dashboard");

  let stats;
  try {
    stats = await getDashboardStats(db, companyId, sinceDate);
  } catch (error) {
    logger.error("Failed to load dashboard stats", error);
    return (
      <div className="rounded-xl border border-warning/20 bg-warning/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-warning" />
        <p className="text-sm text-warning">
          {t("stats.loadError")}
        </p>
      </div>
    );
  }

  // 3 key cards: Revenue this month, Outstanding, Bank balance
  const statCards = [
    {
      ...stats.revenueThisMonth,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      ...stats.outstandingInvoices,
      icon: <FileText className="h-5 w-5" />,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      ...stats.bankBalance,
      icon: <Wallet className="h-5 w-5" />,
      color: "text-tag-purple",
      bgColor: "bg-tag-purple/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {statCards.map((stat, index) => (
        <Link
          key={index}
          href={stat.linkTo}
          className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {t(stat.labelKey)}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bgColor}`}
            >
              <div className={stat.color}>{stat.icon}</div>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">
              {stat.type === "currency"
                ? formatCurrency(stat.value)
                : stat.value}
            </p>
            {stat.count !== undefined && stat.count > 0 && (
              <p className="text-sm text-muted-foreground">
                {stat.count}{" "}
                {stat.count === 1 ? t("stats.document") : t("stats.documents")}
              </p>
            )}
            {stat.changePercent !== undefined && (
              <div className="mt-1 flex items-center gap-1 text-sm">
                {stat.changePercent > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-success" />
                    <span className="text-success">
                      +{stat.changePercent.toFixed(1)}% {t("stats.vsLastMonth")}
                    </span>
                  </>
                ) : stat.changePercent < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">
                      {stat.changePercent.toFixed(1)}% {t("stats.vsLastMonth")}
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
