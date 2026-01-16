import { useMemo } from "react";
import {
  CorrectOrderInput,
  CreateOrderInput,
  RecordPaymentInput,
  correctOrder,
  createOrder,
  getOrderSummary,
  recordPayment,
} from "../lib/api-client";

export function useApiClient() {
  return useMemo(
    () => ({
      createOrder: (input: CreateOrderInput) => createOrder(input),
      recordPayment: (input: RecordPaymentInput) => recordPayment(input),
      correctOrder: (input: CorrectOrderInput) => correctOrder(input),
      getOrderSummary: (businessId: string, dateRange?: { start: string; end: string }) =>
        getOrderSummary(businessId, dateRange),
    }),
    [],
  );
}
