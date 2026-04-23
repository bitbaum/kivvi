import { LanguageSwitcher } from "@/components/language-switcher";
import { RegisterForm } from "./register-form";
import { RegisterFeaturesPanel } from "./register-features-panel";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const { email, callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Language switcher */}
      <div className="fixed right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* Left side - Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <RegisterForm prefillEmail={email} callbackUrl={callbackUrl} />
        </div>
      </div>

      <RegisterFeaturesPanel />
    </div>
  );
}
