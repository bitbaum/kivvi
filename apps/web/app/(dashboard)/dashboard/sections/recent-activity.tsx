import { getRecentActivity } from "@kivvi/core/src/domain/dashboard";
import { db } from "@/lib/db";
import { getSessionOrRedirect } from "@/lib/session";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { logger } from "@/lib/logger";
import {
  FileText,
  Receipt,
  ShoppingCart,
  Truck,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  Package as PackageIcon,
  FileInput,
  Clock,
} from "lucide-react";

export async function RecentActivity() {
  const session = await getSessionOrRedirect();
  const companyId = session.user.companyId;
  const t = await getTranslations("dashboard");

  let activities;
  try {
    activities = await getRecentActivity(db, companyId, 10);
  } catch (error) {
    logger.error("Failed to load recent activity", error);
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 text-center dark:border-yellow-900 dark:bg-yellow-950">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-yellow-600" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {t("activity.loadError")}
        </p>
      </div>
    );
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "invoice":
        return <FileText className="h-4 w-4" />;
      case "quote":
        return <Receipt className="h-4 w-4" />;
      case "order":
        return <ShoppingCart className="h-4 w-4" />;
      case "delivery_note":
        return <Truck className="h-4 w-4" />;
      case "credit_note":
        return <CreditCard className="h-4 w-4" />;
      case "dunning":
        return <AlertCircle className="h-4 w-4" />;
      case "purchase_order":
        return <PackageIcon className="h-4 w-4" />;
      case "purchase_invoice":
        return <FileInput className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000,
    );

    if (diffInSeconds < 60) return t("activity.justNow");
    if (diffInSeconds < 3600)
      return t("activity.minutesAgo", {
        count: Math.floor(diffInSeconds / 60),
      });
    if (diffInSeconds < 86400)
      return t("activity.hoursAgo", {
        count: Math.floor(diffInSeconds / 3600),
      });
    if (diffInSeconds < 604800)
      return t("activity.daysAgo", {
        count: Math.floor(diffInSeconds / 86400),
      });
    return t("activity.weeksAgo", {
      count: Math.floor(diffInSeconds / 604800),
    });
  };

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold">{t("activity.noActivity")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("activity.noActivityDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("activity.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("activity.subtitle")}
          </p>
        </div>
      </div>
      <div className="rounded-xl border bg-card">
        <div className="divide-y">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={activity.linkTo}
              className="group flex items-center gap-4 p-4 transition-colors hover:bg-accent"
            >
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {getIconForType(activity.type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{activity.number}</p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {t(activity.actionKey)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {activity.contactName && (
                      <>
                        <span>{activity.contactName}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{getRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency(activity.amount)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
