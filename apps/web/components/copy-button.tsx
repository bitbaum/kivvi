"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Small copy-to-clipboard button. Shows a check mark for 2 seconds after copying.
 */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      title={label || "Copy"}
      aria-label={label || "Copy to clipboard"}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
