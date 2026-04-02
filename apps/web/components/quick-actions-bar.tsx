import Link from "next/link";
import { cn } from "@/lib/utils";

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: "primary" | "outline";
}

interface QuickActionsBarProps {
  actions: QuickAction[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const isExternal = action.href.startsWith("mailto:");
        const Component = isExternal ? "a" : Link;
        return (
          <Component
            key={action.href}
            href={action.href}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              action.variant === "primary"
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "border hover:bg-muted",
            )}
          >
            {action.icon}
            {action.label}
          </Component>
        );
      })}
    </div>
  );
}
