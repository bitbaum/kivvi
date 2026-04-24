"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { createInventoryItemAction } from "@/app/actions/inventory-items";
import { ITEM_CONDITION_CONFIG } from "@/lib/config/inventory-items";
import { ITEM_CONDITION_VALUES } from "@kivvi/database/src/enums";

// ─── Category list (human-readable labels) ───────────────────────────────────
const QUICK_CATEGORIES = [
  { value: "laptop", labelKey: "categoryLaptop" },
  { value: "desktop", labelKey: "categoryDesktop" },
  { value: "monitor", labelKey: "categoryMonitor" },
  { value: "phone", labelKey: "categoryPhone" },
  { value: "tablet", labelKey: "categoryTablet" },
  { value: "printer", labelKey: "categoryPrinter" },
  { value: "keyboard", labelKey: "categoryKeyboard" },
  { value: "bike", labelKey: "categoryBike" },
  { value: "clothing", labelKey: "categoryClothing" },
  { value: "furniture", labelKey: "categoryFurniture" },
  { value: "book", labelKey: "categoryBook" },
  { value: "appliance", labelKey: "categoryAppliance" },
  { value: "other", labelKey: "categoryOther" },
] as const;

// ─── Client-side photo compression ───────────────────────────────────────────
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

type Step = 1 | 2 | 3 | 4;

export default function QuickIntakePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [condition, setCondition] = useState<string>("untested");
  const [donorName, setDonorName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ─── Step 1: Photo ──────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoBase64(compressed);
      setStep(2);
    } catch {
      setError(ti("quickPhotoError"));
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!description.trim()) {
      setError(ti("descriptionRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createInventoryItemAction({
        description: description.trim(),
        category: category || null,
        condition,
        photoBase64: photoBase64 || undefined,
        notes: donorName ? `${ti("donor")}: ${donorName}` : undefined,
      });
      if (result.success && result.data) {
        router.push(`/intake/items/${result.data.id}`);
      } else {
        setError(result.error || ti("quickSubmitError"));
      }
    });
  }

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() =>
            step > 1 ? setStep((step - 1) as Step) : router.back()
          }
          className="rounded-lg p-2 hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={tc("back")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ti("quickIntake")}</h1>
          <p className="text-xs text-muted-foreground">
            {ti("quickStep", { step, total: totalSteps })}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Step 1: Photo ────────────────────────────────────────────────────── */}
      {step === 1 && (
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
                onClick={() => setPhotoBase64(null)}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
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
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
              >
                {tc("continue")}
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setStep(2)}
              className="text-sm text-muted-foreground hover:text-foreground underline text-center"
            >
              {ti("quickSkipPhoto")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Description + Category ──────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">{ti("quickDescribe")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ti("quickDescribeHint")}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {ti("description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={ti("quickDescriptionPlaceholder")}
                rows={3}
                className="w-full rounded-xl border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {ti("category")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`rounded-xl border px-3 py-3 text-sm font-medium text-left transition-colors min-h-[44px] ${
                      category === cat.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {ti(cat.labelKey as Parameters<typeof ti>[0])}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (!description.trim()) {
                setError(ti("descriptionRequired"));
                return;
              }
              setError(null);
              setStep(3);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
          >
            {tc("continue")}
            <ChevronRight className="h-5 w-5" />
          </button>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      )}

      {/* ── Step 3: Condition ────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">{ti("quickCondition")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ti("quickConditionHint")}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ITEM_CONDITION_VALUES.map((c) => {
              const cfg = ITEM_CONDITION_CONFIG[c];
              const isSelected = condition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCondition(c);
                  }}
                  className={`flex items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-colors min-h-[56px] ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-muted-foreground/20 hover:bg-muted"
                  }`}
                >
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${cfg?.style ?? ""}`}
                  >
                    {cfg?.shortLabel ?? c}
                  </span>
                  <span className="text-base font-medium">
                    {ti((cfg?.labelKey as Parameters<typeof ti>[0]) ?? c)}
                  </span>
                  {isSelected && (
                    <Check className="ml-auto h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep(4)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 min-h-[56px]"
          >
            {tc("continue")}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Step 4: Donor (optional) + Submit ───────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">{ti("quickDonor")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {ti("quickDonorHint")}
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              {ti("donor")}
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder={ti("quickDonorPlaceholder")}
              className="w-full rounded-xl border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{ti("description")}</span>
              <span className="font-medium text-right max-w-[60%] truncate">
                {description}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{ti("category")}</span>
              <span className="font-medium">
                {ti(
                  (QUICK_CATEGORIES.find((c) => c.value === category)
                    ?.labelKey ?? "categoryOther") as Parameters<typeof ti>[0],
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{ti("condition")}</span>
              <span
                className={`font-medium ${ITEM_CONDITION_CONFIG[condition]?.style ?? ""}`}
              >
                {ti(
                  (ITEM_CONDITION_CONFIG[condition]?.labelKey ??
                    condition) as Parameters<typeof ti>[0],
                )}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 min-h-[56px]"
          >
            {isPending ? (
              ti("quickSaving")
            ) : (
              <>
                <Check className="h-5 w-5" />
                {ti("quickSave")}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
