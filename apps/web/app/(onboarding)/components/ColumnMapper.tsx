"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type {
  MappingProfile,
  MappingField,
} from "@kivvi/core/src/domain/import-mappings";

interface ColumnMapperProps {
  headers: string[];
  profile: MappingProfile;
  onMappingConfirmed: (mapping: MappingField[]) => void;
}

export function ColumnMapper({
  headers,
  profile,
  onMappingConfirmed,
}: ColumnMapperProps) {
  const t = useTranslations("onboarding");
  const [mapping, setMapping] = useState<MappingField[]>(profile.fields);

  // Auto-set initial mapping from profile
  useEffect(() => {
    setMapping(profile.fields);
  }, [profile]);

  const handleSourceChange = (targetField: string, newSource: string) => {
    setMapping((prev) =>
      prev.map((f) =>
        f.target === targetField ? { ...f, source: newSource } : f,
      ),
    );
  };

  const handleConfirm = () => {
    // Only include fields that have a source column
    const validMapping = mapping.filter(
      (f) => f.source && headers.includes(f.source),
    );
    onMappingConfirmed(validMapping);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t("autoDetected", { name: profile.name })}
      </div>

      <div className="max-h-80 overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("targetField")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("sourceColumn")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mapping.map((field) => (
              <tr key={field.target}>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{field.target}</span>
                  {field.transform && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({field.transform})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={field.source}
                    onChange={(e) =>
                      handleSourceChange(field.target, e.target.value)
                    }
                    className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- {t("skip")} --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("confirmMapping")}
        </button>
      </div>
    </div>
  );
}
