import { PackageOpen, ClipboardCheck, BarChart3 } from "lucide-react";

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

export function ScenariosSection() {
  return (
    <section className="mx-auto max-w-4xl py-16">
      <h2 className="mb-12 text-center text-3xl font-bold">
        Ein ganz normaler Tag
      </h2>
      <div className="space-y-12">
        <ScenarioCard
          time="Dienstag, 9 Uhr"
          title="Wareneingang"
          text="Eine Firma liefert 50 ausgemusterte Laptops. Sie tippen '50 Lenovo ThinkPad' und drücken Enter. 50 Artikel erfasst, QR-Etiketten druckbereit, Spendenquittung generiert."
          icon={<PackageOpen className="h-5 w-5" />}
          color="blue"
        />
        <ScenarioCard
          time="Mittwoch, 14 Uhr"
          title="Prüfung & Reparatur"
          text="Freiwillige Maria öffnet Laptop #23. Akku: 78%. Bildschirm: Kratzer. Zustand: Mittel. Neue Batterie: CHF 40. In 30 Sekunden erfasst — Reparaturkosten fliessen direkt in die Margenberechnung."
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="amber"
        />
        <ScenarioCard
          time="Freitag, 16 Uhr"
          title="Verkauf & Impact"
          text="Kunde kommt rein. CHF 80 statt CHF 135 — Richtpreis, angepasst an sein Budget. QR scannen. Fertig. Dashboard zeigt: CHF 30 Marge, 25 kg Elektroschrott vermieden."
          icon={<BarChart3 className="h-5 w-5" />}
          color="green"
        />
      </div>
    </section>
  );
}
