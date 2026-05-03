"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { createInventoryItemAction } from "@/app/actions/inventory-items";
import { StepPhoto } from "./_components/step-photo";
import { StepDescription } from "./_components/step-description";
import { StepCondition } from "./_components/step-condition";
import { StepDonor } from "./_components/step-donor";

type Step = 1 | 2 | 3 | 4;

export default function QuickIntakePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ti = useTranslations("inventory");
  const tc = useTranslations("common");

  const [step, setStep] = useState<Step>(1);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [condition, setCondition] = useState<string>("untested");
  const [donorContactId, setDonorContactId] = useState<string | null>(null);
  const [donorDisplayName, setDonorDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

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
        donorContactId: donorContactId || undefined,
      });
      if (result.success && result.data) {
        router.push(`/intake/items/${result.data.id}`);
      } else {
        setError(result.error || ti("quickSubmitError"));
      }
    });
  }

  function handleStep2Next() {
    if (!description.trim()) {
      setError(ti("descriptionRequired"));
      return;
    }
    setError(null);
    setStep(3);
  }

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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

      <div className="mb-8 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {step === 1 && (
        <StepPhoto
          photoBase64={photoBase64}
          onPhotoCapture={(b64) => {
            setPhotoBase64(b64);
            setStep(2);
          }}
          onPhotoClear={() => setPhotoBase64(null)}
          onError={setError}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepDescription
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          error={error}
          onNext={handleStep2Next}
        />
      )}
      {step === 3 && (
        <StepCondition
          condition={condition}
          setCondition={setCondition}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <StepDonor
          donorContactId={donorContactId}
          donorDisplayName={donorDisplayName}
          onDonorChange={(id, name) => {
            setDonorContactId(id);
            setDonorDisplayName(name);
          }}
          description={description}
          category={category}
          condition={condition}
          error={error}
          isPending={isPending}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
