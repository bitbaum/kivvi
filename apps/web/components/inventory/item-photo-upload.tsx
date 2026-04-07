"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import {
  uploadItemPhotoAction,
  removeItemPhotoAction,
} from "@/app/actions/inventory-items";
import { cn } from "@/lib/utils";

interface ItemPhotoUploadProps {
  itemId: string;
  initialPhotoBase64: string | null;
}

export function ItemPhotoUpload({
  itemId,
  initialPhotoBase64,
}: ItemPhotoUploadProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialPhotoBase64,
  );
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
      formData.append("photo", file);

      const result = await uploadItemPhotoAction(itemId, formData);
      if (result.success) {
        // Read the file into a data URL for immediate preview
        const reader = new FileReader();
        reader.onload = () => setPhotoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    setError(null);
    try {
      const result = await removeItemPhotoAction(itemId);
      if (result.success) {
        setPhotoPreview(null);
      } else {
        setError(result.error || "Remove failed");
      }
    } catch {
      setError("Remove failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {photoPreview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */}
          <img
            src={photoPreview}
            alt="Item photo"
            className="h-48 w-48 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 disabled:opacity-50"
            aria-label="Remove photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex h-48 w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50",
            isUploading && "pointer-events-none opacity-50",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Upload className="h-3.5 w-3.5" />
                Upload photo
              </div>
              <p className="text-xs text-muted-foreground/70">
                PNG, JPG, WebP · max 500KB
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
