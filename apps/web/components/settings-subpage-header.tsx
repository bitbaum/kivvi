import { BackButton } from "@/components/back-button";

interface SettingsSubpageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
}

/**
 * Consistent header for settings subpages (back link + title + description).
 */
export async function SettingsSubpageHeader({
  title,
  description,
  backHref = "/settings",
}: SettingsSubpageHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <BackButton href={backHref} />
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
