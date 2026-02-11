'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { getOnboardingStateAction, getCompanyDetailsAction } from '@/app/actions/onboarding';
import { OnboardingShell } from '../components/OnboardingShell';
import { StepCompanyInfo } from '../components/StepCompanyInfo';
import { StepBusinessConfig } from '../components/StepBusinessConfig';
import { StepDataImport } from '../components/StepDataImport';

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [currentStep, setCurrentStep] = useState<number>(0); // 0 = loading
  const [companyName, setCompanyName] = useState('');
  const [companyData, setCompanyData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    async function loadState() {
      const [stateResult, companyResult] = await Promise.all([
        getOnboardingStateAction(),
        getCompanyDetailsAction(),
      ]);

      if (stateResult.success && stateResult.data) {
        if (stateResult.data.completedAt) {
          router.push('/dashboard');
          return;
        }
        setCurrentStep(stateResult.data.step || 1);
        setCompanyName(stateResult.data.companyName || '');
      } else {
        setCurrentStep(1);
      }

      if (companyResult.success && companyResult.data) {
        setCompanyData(companyResult.data);
      }
    }
    loadState();
  }, [router]);

  const handleStepComplete = useCallback(async (nextStep: number) => {
    if (nextStep > 4) {
      // Onboarding done — refresh session to get onboardingComplete flag
      await updateSession({});
      router.push('/dashboard');
      router.refresh();
    } else {
      setCurrentStep(nextStep);
    }
  }, [router, updateSession]);

  if (currentStep === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <OnboardingShell currentStep={currentStep} totalSteps={3}>
      {currentStep === 1 && (
        <StepCompanyInfo
          companyData={companyData}
          onComplete={() => handleStepComplete(2)}
        />
      )}
      {currentStep === 2 && (
        <StepBusinessConfig
          onComplete={() => handleStepComplete(3)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep >= 3 && (
        <StepDataImport
          onComplete={() => handleStepComplete(5)}
        />
      )}
    </OnboardingShell>
  );
}
