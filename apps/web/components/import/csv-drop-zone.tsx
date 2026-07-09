"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";

export interface CsvDropZoneProps {
  onFile: (file: File) => void;
  /** Primary label (already translated) */
  label: string;
  /** Hint below the label (already translated) */
  hint?: string;
  accept?: string;
  /** Visual density */
  size?: "default" | "compact";
  disabled?: boolean;
}

/**
 * Shared drag-and-drop CSV file picker.
 * SSOT for import UIs (inventory, products, repair import, onboarding).
 */
export function CsvDropZone({
  onFile,
  label,
  hint,
  accept = ".csv,text/csv",
  size = "default",
  disabled = false,
}: CsvDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      onFile(file);
    },
    [disabled, onFile],
  );

  const padding = size === "compact" ? "p-6" : "p-10";

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors ${padding} ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{label}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" aria-hidden />
        CSV
      </p>
    </div>
  );
}
