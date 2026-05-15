"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProjectTableRowProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

export function ProjectTableRow({
  href,
  className,
  children,
}: ProjectTableRowProps) {
  const router = useRouter();
  return (
    <tr
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50",
        className,
      )}
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  );
}
