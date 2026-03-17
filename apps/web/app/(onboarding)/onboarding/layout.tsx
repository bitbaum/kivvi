import Link from "next/link";
import { KivviLogo } from "@/components/kivvi-logo";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <KivviLogo size={32} />
          <span className="text-xl font-bold">Kivvi</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
