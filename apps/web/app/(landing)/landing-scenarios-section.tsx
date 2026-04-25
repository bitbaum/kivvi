import { PackageOpen, ClipboardCheck, BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";

const SCENARIO_COLORS = {
  blue: "border-l-info bg-info/5",
  amber: "border-l-warning bg-warning/5",
  green: "border-l-success bg-success/5",
};

function ScenarioCard({
  time,
  title,
  text,
  icon,
  color,
}: {
  time: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  color: "blue" | "amber" | "green";
}) {
  return (
    <div
      className={`rounded-xl border-l-4 p-6 sm:p-8 ${SCENARIO_COLORS[color]}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{time}</span>
        </div>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

export async function ScenariosSection() {
  const t = await getTranslations("landing");
  return (
    <section className="mx-auto max-w-4xl py-16">
      <h2 className="mb-12 text-center text-3xl font-bold">
        {t("scenarioTitle")}
      </h2>
      <div className="space-y-12">
        <ScenarioCard
          time={t("scenario1Time")}
          title={t("scenario1Title")}
          text={t("scenario1Text")}
          icon={<PackageOpen className="h-5 w-5" />}
          color="blue"
        />
        <ScenarioCard
          time={t("scenario2Time")}
          title={t("scenario2Title")}
          text={t("scenario2Text")}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="amber"
        />
        <ScenarioCard
          time={t("scenario3Time")}
          title={t("scenario3Title")}
          text={t("scenario3Text")}
          icon={<BarChart3 className="h-5 w-5" />}
          color="green"
        />
      </div>
    </section>
  );
}
