import { CheckCircle2 } from "lucide-react";

export function SolutionList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 p-4"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span className="text-sm">{item}</span>
        </div>
      ))}
    </div>
  );
}
