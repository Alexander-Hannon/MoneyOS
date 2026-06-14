"use client";

import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { AppModeProvider } from "@/context/AppModeProvider";
import { FinancialDataProvider } from "@/context/FinancialDataProvider";
import { MoneyDataProvider } from "@/lib/storage/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MoneyDataProvider>
      <AppModeProvider>
        <FinancialDataProvider>
          <OnboardingDialog />
          {children}
        </FinancialDataProvider>
      </AppModeProvider>
    </MoneyDataProvider>
  );
}
