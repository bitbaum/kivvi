import { BackButton } from "@/components/back-button";

interface SettingsSubpageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  /** Status badge or inline element next to the title */
  badge?: React.ReactNode;
  /** Primary/secondary actions (e.g. Create button) */
  actions?: React.ReactNode;
}

/**
 * Consistent header for settings subpages (back link + title + description).
 */
export async function SettingsSubpageHeader({
  title,
  description,
  backHref = "/settings",
  badge,
  actions,
}: SettingsSubpageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <BackButton href={backHref} className="mt-0.5" />
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
