import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CardSection } from "@/components/card-section";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";
import type { ChecklistData } from "@kivvi/core/src/config/checklist-templates";

interface ItemChecklistDisplayProps {
  checklistData: ChecklistData | null;
}

export async function ItemChecklistDisplay({
  checklistData,
}: ItemChecklistDisplayProps) {
  if (!checklistData?.completions?.length) return null;

  const ti = await getTranslations("inventory");
  const tck = await getTranslations("checklist");

  const template = getChecklistTemplate(checklistData.category);
  const completionMap = new Map(
    checklistData.completions.map((c) => [c.id, c]),
  );
  const passed = checklistData.completions.filter(
    (c) => c.result === "pass",
  ).length;
  const failed = checklistData.completions.filter(
    (c) => c.result === "fail",
  ).length;
  const skipped = checklistData.completions.filter(
    (c) => c.result === "skip",
  ).length;

  return (
    <CardSection title={ti("checklistResults")}>
      {/* Summary badges */}
      <div className="mb-3 flex gap-2 text-xs">
        {passed > 0 && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">
            {passed} ✓
          </span>
        )}
        {failed > 0 && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
            {failed} ✗
          </span>
        )}
        {skipped > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {skipped} —
          </span>
        )}
      </div>
      {/* Individual checks */}
      <div className="space-y-1">
        {template.checks
          .map((check) => ({ check, completion: completionMap.get(check.id) }))
          .filter(
            (
              entry,
            ): entry is typeof entry & {
              completion: NonNullable<typeof entry.completion>;
            } => !!entry.completion,
          )
          .map(({ check, completion }) => {
            return (
              <div
                key={check.id}
                className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted/50"
              >
                <span className="text-muted-foreground">
                  {tck(check.labelKey as Parameters<typeof tck>[0])}
                </span>
                <span
                  className={cn(
                    "font-medium",
                    completion.result === "pass" && "text-success",
                    completion.result === "fail" && "text-destructive",
                    completion.result === "skip" && "text-muted-foreground",
                  )}
                >
                  {completion.result === "pass" && "✓"}
                  {completion.result === "fail" && "✗"}
                  {completion.result === "skip" && "—"}
                  {check.type === "measurement" &&
                    completion.value &&
                    ` ${completion.value}${check.unit ?? ""}`}
                </span>
              </div>
            );
          })}
      </div>
      {/* QC sign-off */}
      {checklistData.signedOffAt && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
          <span>✓</span>
          <span>
            {ti("checklistSignedOff")} {formatDate(checklistData.signedOffAt)}
          </span>
        </div>
      )}
    </CardSection>
  );
}
