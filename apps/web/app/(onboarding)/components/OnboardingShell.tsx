'use client';

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
}

export function OnboardingShell({ currentStep, totalSteps, children }: OnboardingShellProps) {
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  const stepLabels = ['Company Info', 'Business Setup', 'Data Import'];

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Step {Math.min(currentStep, totalSteps)} of {totalSteps}
          </span>
          <span className="text-muted-foreground">
            {stepLabels[Math.min(currentStep, totalSteps) - 1]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="mt-3 flex justify-between">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  i + 1 <= currentStep
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
                }`}
              />
              <span
                className={`hidden text-xs sm:inline ${
                  i + 1 <= currentStep
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      {children}
    </div>
  );
}
