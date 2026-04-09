import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main className="container mx-auto px-4">{children}</main>
      <LandingFooter />
    </div>
  );
}
