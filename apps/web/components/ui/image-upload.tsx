"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared image upload component — SSOT for all base64 image upload/display.
 *
 * Used by: company logo, user avatar, inventory item photo.
 * Pattern: file input → validate → base64 → server action → preview.
 */

interface ImageUploadProps {
  /** Current base64 data URI (or null if no image) */
  currentImage: string | null;
  /** Server action to upload: receives FormData with file under `fieldName` */
  onUpload: (
    formData: FormData,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Server action to remove the image */
  onRemove: () => Promise<{ success: boolean; error?: string }>;
  /** Form field name for the file input (default: "photo") */
  fieldName?: string;
  /** Accepted MIME types */
  accept?: string;
  /** Max file size in bytes (default: 500KB) */
  maxSize?: number;
  /** Display size — "sm" (48px), "md" (128px), "lg" (192px) */
  size?: "sm" | "md" | "lg";
  /** CSS class for the container */
  className?: string;
  /** Alt text for the image */
  alt?: string;
}

const SIZE_CLASSES = {
  sm: "h-12 w-12",
  md: "h-32 w-32",
  lg: "h-48 w-48",
};

export function ImageUpload({
  currentImage,
  onUpload,
  onRemove,
  fieldName = "photo",
  accept = "image/png,image/jpeg,image/webp",
  maxSize = 500 * 1024,
  size = "lg",
  className,
  alt = "Image",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sizeClass = SIZE_CLASSES[size];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      setError(`File too large. Max ${Math.round(maxSize / 1024)}KB.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append(fieldName, file);
      const result = await onUpload(formData);

      if (result.success) {
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setError(result.error || "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setIsUploading(true);
    setError(null);
    try {
      const result = await onRemove();
      if (result.success) setPreview(null);
      else setError(result.error || "Remove failed");
    } catch {
      setError("Remove failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */}
          <img
            src={preview}
            alt={alt}
            className={cn(sizeClass, "rounded-lg border object-cover")}
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 disabled:opacity-50"
            aria-label="Remove image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            sizeClass,
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50",
            isUploading && "pointer-events-none opacity-50",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Upload className="h-3 w-3" />
                Upload
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={accept}
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
