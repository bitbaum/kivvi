import { CopyButton } from "@/components/copy-button";

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}

/**
 * Horizontal info row with icon, label, and value.
 * Used in contact/product detail pages for fields like email, phone, etc.
 */
export function InfoRow({ icon, label, value, copyable }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm">{value || "-"}</p>
          {copyable && value && <CopyButton value={value} />}
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}

/**
 * Stacked info item with label and value.
 * Used in sidebar sections for fields like VAT number, IBAN, dates, etc.
 */
export function InfoItem({ label, value, copyable }: InfoItemProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm font-medium">{value || "-"}</p>
        {copyable && value && <CopyButton value={value} />}
      </div>
    </div>
  );
}
