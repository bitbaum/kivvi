import { cn } from "@/lib/utils";

interface CardSectionProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function CardSection({
  title,
  icon,
  actions,
  children,
  noPadding,
  className,
}: CardSectionProps) {
  return (
    <div className={cn("ui-panel", className)}>
      <div className="ui-panel-header">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {actions}
      </div>
      <div className={noPadding ? undefined : "p-6"}>{children}</div>
    </div>
  );
}
