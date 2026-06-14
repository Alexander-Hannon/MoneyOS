"use client";

import { LocalDataMigrationDialog } from "@/components/auth/LocalDataMigrationDialog";
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
          <LocalDataMigrationDialog />
          {children}
        </FinancialDataProvider>
      </AppModeProvider>
    </MoneyDataProvider>
  );
}
