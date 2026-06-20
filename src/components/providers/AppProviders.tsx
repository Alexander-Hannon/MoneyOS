"use client";

import { LocalDataMigrationDialog } from "@/components/auth/LocalDataMigrationDialog";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { AppModeProvider } from "@/context/AppModeProvider";
import { AccountDataSyncProvider } from "@/context/AccountDataSyncProvider";
import { FinancialDataProvider } from "@/context/FinancialDataProvider";
import { PlaidConnectionProvider } from "@/context/PlaidConnectionProvider";
import { MoneyDataProvider } from "@/lib/storage/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MoneyDataProvider>
      <AppModeProvider>
        <FinancialDataProvider>
          <AccountDataSyncProvider>
            <PlaidConnectionProvider>
              <OnboardingDialog />
              <LocalDataMigrationDialog />
              {children}
            </PlaidConnectionProvider>
          </AccountDataSyncProvider>
        </FinancialDataProvider>
      </AppModeProvider>
    </MoneyDataProvider>
  );
}
