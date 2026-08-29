import Link from "next/link";
import { Calendar, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  PROJECT_STATUS_STYLES as STATUS_STYLES,
  PROJECT_STATUS_LABEL_KEYS,
} from "@/lib/config/project-status";
import type { getProject } from "@kivvi/core";

type Project = NonNullable<Awaited<ReturnType<typeof getProject>>>;

interface ProjectDetailSidebarProps {
  project: Project;
}

export async function ProjectDetailSidebar({ project }: ProjectDetailSidebarProps) {
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");

  return (
    <div className="space-y-6">
      {/* Client Info */}
      {project.contactName && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {t("client")}
          </h2>
          <div className="space-y-1 text-sm">
            <p className="font-medium">{project.contactName}</p>
          </div>
          <Link
            href={`/contacts/${project.contactId}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            {t("viewContact")}
          </Link>
        </div>
      )}

      {/* Project Details */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {t("details")}
          </h2>
        </div>
        <div className="divide-y">
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{tc("status")}</span>
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[project.status ?? "active"] || "",
              )}
            >
              {t(
                PROJECT_STATUS_LABEL_KEYS[
                  (project.status ?? "active") as keyof typeof PROJECT_STATUS_LABEL_KEYS
                ] || "statusActive",
              )}
            </span>
          </div>
          {project.budget && (
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-muted-foreground">{t("budget")}</span>
              <span className="text-sm font-medium">{formatCurrency(project.budget)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("startDate")}</span>
            <span className="text-sm">
              {project.startDate ? formatDate(project.startDate) : tc("notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("endDate")}</span>
            <span className="text-sm">
              {project.endDate ? formatDate(project.endDate) : tc("notSet")}
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("createdAt")}</span>
            <span className="text-sm">{formatDate(project.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-muted-foreground">{t("updatedAt")}</span>
            <span className="text-sm">{formatDate(project.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
