"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Cpu,
  Cloud,
  Server,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModelOption {
  providerId: string;
  modelId: string;
  name: string;
  isFree: boolean;
  supportsTools: boolean;
}

interface ModelSelectorProps {
  models: ModelOption[];
  selectedModel: string | null;
  onModelChange: (providerId: string, modelId: string) => void;
  disabled?: boolean;
  /** Fallback label to show while models are loading */
  fallbackLabel?: string;
}

const providerIcons: Record<string, typeof Cloud> = {
  groq: Zap,
  xai: Cpu,
  openrouter: Cloud,
  ollama: Server,
  anthropic: Sparkles,
};

const providerLabels: Record<string, string> = {
  groq: "Groq",
  xai: "xAI (Grok)",
  openrouter: "OpenRouter",
  ollama: "Local (Ollama)",
  anthropic: "Anthropic",
};

export function ModelSelector({
  models,
  selectedModel,
  onModelChange,
  disabled = false,
  fallbackLabel,
}: ModelSelectorProps) {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = useState(false);

  // Find selected model info
  const selected = models.find((m) => m.modelId === selectedModel);

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.providerId]) {
        acc[model.providerId] = [];
      }
      acc[model.providerId].push(model);
      return acc;
    },
    {} as Record<string, ModelOption[]>,
  );

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".model-selector")) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const Icon = selected ? providerIcons[selected.providerId] || Cpu : Cpu;

  return (
    <div className="model-selector relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5 text-sm transition-colors hover:bg-muted",
          disabled && "cursor-not-allowed opacity-50",
          isOpen && "ring-2 ring-primary",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[120px] truncate">
          {selected?.name ||
            fallbackLabel ||
            (models.length === 0 ? t("aiModel") : t("selectModel"))}
        </span>
        {selected?.isFree && (
          <span className="rounded bg-success/50/20 px-1.5 py-0.5 text-xs font-medium text-success">
            {t("free")}
          </span>
        )}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-card shadow-lg">
          <div className="max-h-80 overflow-y-auto p-1">
            {Object.entries(groupedModels).map(
              ([providerId, providerModels]) => {
                const ProviderIcon = providerIcons[providerId] || Cpu;
                return (
                  <div key={providerId}>
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <ProviderIcon className="h-3.5 w-3.5" />
                      {providerLabels[providerId] || providerId}
                    </div>
                    {providerModels.map((model) => (
                      <button
                        key={model.modelId}
                        onClick={() => {
                          onModelChange(model.providerId, model.modelId);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted",
                          selectedModel === model.modelId && "bg-muted",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{model.name}</span>
                          {model.isFree && (
                            <span className="rounded bg-success/50/20 px-1.5 py-0.5 text-xs font-medium text-success">
                              {t("free")}
                            </span>
                          )}
                        </div>
                        {selectedModel === model.modelId && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                );
              },
            )}
          </div>
          <div className="border-t p-2">
            <p className="text-xs text-muted-foreground">
              {t("freeModelsRateLimit")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
