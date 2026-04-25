import {
  Sparkles,
  MessageSquare,
  Zap,
  Tag,
  ClipboardCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

function AIFeature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-primary">{icon}</div>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

export async function AIAutopilotSection() {
  const t = await getTranslations("landing.aiAutopilot");
  return (
    <section className="mx-auto max-w-4xl py-8">
      <div className="rounded-2xl border bg-card p-8 sm:p-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4 font-mono text-sm">
          <span className="text-muted-foreground">{t("exampleLabel")}</span>
          <span className="font-medium">{t("exampleInput")}</span>
          <br />
          <span className="text-primary">{t("exampleAction")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AIFeature
            icon={<MessageSquare className="h-4 w-4" />}
            text={t("feature1")}
          />
          <AIFeature icon={<Zap className="h-4 w-4" />} text={t("feature2")} />
          <AIFeature icon={<Tag className="h-4 w-4" />} text={t("feature3")} />
          <AIFeature
            icon={<ClipboardCheck className="h-4 w-4" />}
            text={t("feature4")}
          />
        </div>
      </div>
    </section>
  );
}
