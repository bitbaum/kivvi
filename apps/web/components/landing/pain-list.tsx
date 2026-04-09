import { X } from "lucide-react";

export function PainList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4"
        >
          <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span className="text-sm">{item}</span>
        </div>
      ))}
    </div>
  );
}
