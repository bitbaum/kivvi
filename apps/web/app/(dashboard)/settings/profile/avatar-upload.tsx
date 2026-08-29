"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { uploadAvatarAction, removeAvatarAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  initialAvatarBase64: string | null;
  userName: string;
}

export function AvatarUpload({ initialAvatarBase64, userName }: AvatarUploadProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarBase64);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadAvatarAction(formData);
      if (result.success) {
        const reader = new FileReader();
        reader.onload = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    setError(null);

    try {
      const result = await removeAvatarAction();
      if (result.success) {
        setAvatarPreview(null);
        router.refresh();
      } else {
        setError(result.error || tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsUploading(false);
    }
  }

  const initial = userName?.charAt(0)?.toUpperCase() || "U";

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("profileSection.avatar")}</h2>
      </div>
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
          {/* Circular preview */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed bg-muted/30 overflow-hidden">
            {avatarPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image optimization not applicable */
              <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center brand-gradient text-lg font-medium text-white">
                {initial}
              </div>
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
              {t("profileSection.uploadAvatar")}
            </button>
            {avatarPreview && (
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
                {t("profileSection.removeAvatar")}
              </button>
            )}
            <p className="text-xs text-muted-foreground">{t("profileSection.avatarHint")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
