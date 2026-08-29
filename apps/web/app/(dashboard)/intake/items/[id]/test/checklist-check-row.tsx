"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, SkipForward, AlertTriangle } from "lucide-react";
import type { ChecklistCheckDef } from "@kivvi/core/src/config/checklist-templates";

type CheckResult = "pass" | "fail" | "skip" | null;

export interface CheckState {
  result: CheckResult;
  value: string;
  skipReason: string;
}

interface CheckRowProps {
  check: ChecklistCheckDef;
  state: CheckState;
  onChange: (s: CheckState) => void;
  tl: (key: string) => string;
  tc: (key: string) => string;
}

export function CheckRow({ check, state, onChange, tl, tc }: CheckRowProps) {
  const label = tl(check.labelKey);
  const isBlocking = check.blocking;

  function setResult(r: CheckResult) {
    onChange({ ...state, result: r });
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        state.result === "pass" && "border-success/30 bg-success/5",
        state.result === "fail" && "border-destructive/30 bg-destructive/5",
        state.result === "skip" && "border-warning/30 bg-warning/5",
        !state.result && "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{label}</span>
            {isBlocking && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {tl("blockingBadge")}
              </span>
            )}
          </div>

          {/* Measurement input */}
          {check.type === "measurement" && state.result !== "skip" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder={tc("measurementPlaceholder")}
                value={state.value}
                onChange={(e) =>
                  onChange({
                    ...state,
                    value: e.target.value,
                    result: e.target.value ? "pass" : null,
                  })
                }
                className="h-10 w-28 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {check.unit && <span className="text-sm text-muted-foreground">{check.unit}</span>}
            </div>
          )}

          {/* Confirm type */}
          {check.type === "confirm" && (
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.result === "pass"}
                onChange={(e) => setResult(e.target.checked ? "pass" : null)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm text-muted-foreground">{tc("confirmCheck")}</span>
            </label>
          )}

          {/* Skip reason */}
          {state.result === "skip" && (
            <input
              type="text"
              placeholder={tc("skipReason")}
              value={state.skipReason}
              onChange={(e) => onChange({ ...state, skipReason: e.target.value })}
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
        </div>

        {/* Pass/Fail/Skip buttons (for pass_fail type) */}
        {check.type === "pass_fail" && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setResult(state.result === "pass" ? null : "pass")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "pass"
                  ? "bg-success/50 text-white"
                  : "bg-muted text-muted-foreground hover:bg-success/10 hover:text-success",
              )}
              title={tc("passLabel")}
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setResult(state.result === "fail" ? null : "fail")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "fail"
                  ? "bg-destructive/50 text-white"
                  : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              )}
              title={tc("failLabel")}
            >
              <XCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setResult(state.result === "skip" ? null : "skip")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                state.result === "skip"
                  ? "bg-warning/50 text-white"
                  : "bg-muted text-muted-foreground hover:bg-warning/10 hover:text-warning",
              )}
              title={tc("skipLabel")}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Fail suggestion */}
      {state.result === "fail" && check.failSuggestsStatus && (
        <div role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          {tl("failSuggestion").replace("{status}", check.failSuggestsStatus)}
        </div>
      )}
    </div>
  );
}
