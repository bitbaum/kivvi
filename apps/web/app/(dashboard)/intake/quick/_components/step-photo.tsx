"use client";

import { useRef } from "react";
import { Camera, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";

function compressImage(
  file: File,
  maxPx = 600,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

interface StepPhotoProps {
  photoBase64: string | null;
  onPhotoCapture: (base64: string) => void;
  onPhotoClear: () => void;
  onError: (msg: string) => void;
  onNext: () => void;
}

export function StepPhoto({
  photoBase64,
  onPhotoCapture,
  onPhotoClear,
  onError,
  onNext,
}: StepPhotoProps) {
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      onPhotoCapture(compressed);
    } catch {
      onError(ti("quickPhotoError"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{ti("quickTakePhoto")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ti("quickPhotoHint")}
        </p>
      </div>

      {photoBase64 ? (
        <div className="relative rounded-xl overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoBase64}
            alt="Preview"
            className="w-full max-h-64 object-cover"
          />
          <button
            onClick={onPhotoClear}
            aria-label={tc("aria.removePhoto")}
            className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => photoInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-12 hover:border-primary/50 hover:bg-muted/50 transition-colors"
        >
          <Camera className="h-12 w-12 text-muted-foreground/50" />
          <span className="text-sm font-medium text-muted-foreground">
            {ti("quickAddPhoto")}
          </span>
        </button>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
        className="sr-only"
      />

      <div className="flex flex-col gap-3">
        {photoBase64 && (
          <button
            onClick={onNext}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
          >
            {tc("continue")}
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={onNext}
          className="text-sm text-muted-foreground hover:text-foreground underline text-center"
        >
          {ti("quickSkipPhoto")}
        </button>
      </div>
    </div>
  );
}
