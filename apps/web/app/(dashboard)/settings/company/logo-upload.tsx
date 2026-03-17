"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { uploadLogoAction, removeLogoAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

interface LogoUploadProps {
  initialLogoBase64: string | null;
  onError: (error: string | null) => void;
}

export function LogoUpload({ initialLogoBase64, onError }: LogoUploadProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialLogoBase64,
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    onError(null);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await uploadLogoAction(formData);
      if (result.success) {
        const reader = new FileReader();
        reader.onload = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        onError(result.error || tc("error"));
      }
    } catch {
      onError(tc("error"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    onError(null);

    try {
      const result = await removeLogoAction();
      if (result.success) {
        setLogoPreview(null);
      } else {
        onError(result.error || tc("error"));
      }
    } catch {
      onError(tc("error"));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.logo")}</h2>
      </div>
      <div className="p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          {/* Preview */}
          <div className="flex h-24 w-full max-w-[176px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30">
            {logoPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image optimization not applicable */
              <img
                src={logoPreview}
                alt="Company logo"
                className="max-h-20 max-w-40 object-contain"
              />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors",
                isUploading && "opacity-50 cursor-not-allowed",
              )}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t("company.uploadLogo")}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors",
                  isUploading && "opacity-50 cursor-not-allowed",
                )}
              >
                <Trash2 className="h-4 w-4" />
                {t("company.removeLogo")}
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              {t("company.logoFormats")} · {t("company.logoMaxSize")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
