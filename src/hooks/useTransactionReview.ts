"use client";

import { useCallback } from "react";
import { useFinancialData } from "@/hooks/useFinancialData";
import type { TransactionReviewPayload } from "@/types/transaction-review";
import type { MoneyTransaction } from "@/types/transactions";

export type SubmitReviewResult = {
  ok: boolean;
  transaction?: MoneyTransaction;
  persisted: "database" | "local";
  error?: string;
};

export function useTransactionReview() {
  const { submitTransactionReview } = useFinancialData();

  const submitReview = useCallback(
    async (
      transactionId: string,
      payload: TransactionReviewPayload,
    ): Promise<SubmitReviewResult> => {
      return submitTransactionReview(transactionId, payload);
    },
    [submitTransactionReview],
  );

  return { submitReview };
}
