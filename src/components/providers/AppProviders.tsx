"use client";

import { AppModeProvider } from "@/context/AppModeProvider";
import { FinancialDataProvider } from "@/context/FinancialDataProvider";
import { PlaidConnectionProvider } from "@/context/PlaidConnectionProvider";
import { SessionProvider } from "@/context/SessionProvider";
import { MoneyDataProvider } from "@/lib/storage/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MoneyDataProvider>
        <AppModeProvider>
          <FinancialDataProvider>
            <PlaidConnectionProvider>{children}</PlaidConnectionProvider>
          </FinancialDataProvider>
        </AppModeProvider>
      </MoneyDataProvider>
    </SessionProvider>
  );
}
