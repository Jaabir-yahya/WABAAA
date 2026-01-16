import { enqueueAction } from "./offline-queue";

export type CreateOrderInput = {
  business_id: string;
  customer_phone: string;
  customer_name?: string;
  items: Array<{
    product: string;
    quantity: number;
    unit: string;
    price: number;
  }>;
  total_amount: number;
  is_credit?: boolean;
  payment_terms?: string;
  delivery_address?: string;
};

export type RecordPaymentInput = {
  business_id: string;
  order_id: string;
  customer_phone: string;
  amount: number;
  method: "mpesa" | "cash" | "bank";
  mpesa_receipt?: string;
  mpesa_transaction_id?: string;
};

export type CorrectOrderInput = {
  business_id: string;
  order_id: string;
  correction_type: "amount" | "items" | "customer" | "payment_terms";
  new_value: unknown;
  reason: string;
};

export type OrderResponse = {
  order_id: string;
  outstanding_amount: number;
  status: string;
  queued?: boolean;
};

export type PaymentResponse = {
  payment_id: string;
  outstanding_amount: number | null;
  status: string | null;
  idempotent: boolean;
  queued?: boolean;
};

export type SummaryResponse = {
  total_orders: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  orders_by_status: Record<string, number>;
  daily_breakdown: Array<{ date: string; orders: number; revenue: number }>;
};

function getBaseUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) {
    throw new Error("VITE_SUPABASE_URL not configured");
  }
  return `${base}/functions/v1`;
}

function getAnonKey() {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getAnonKey(),
      Authorization: `Bearer ${getAnonKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderResponse> {
  if (!navigator.onLine) {
    const queued = await enqueueAction("create_order", input);
    return {
      order_id: queued.id,
      outstanding_amount: input.total_amount,
      status: "pending",
      queued: true,
    };
  }

  return await callFunction<OrderResponse>("create-order", input);
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<PaymentResponse> {
  if (!navigator.onLine) {
    const queued = await enqueueAction("record_payment", input);
    return {
      payment_id: queued.id,
      outstanding_amount: null,
      status: "pending",
      idempotent: false,
      queued: true,
    };
  }

  return await callFunction<PaymentResponse>("record-payment", input);
}

export async function correctOrder(
  input: CorrectOrderInput,
): Promise<{ order: unknown; correction_applied: boolean; queued?: boolean }> {
  if (!navigator.onLine) {
    const queued = await enqueueAction("correct_order", input);
    return {
      order: { id: input.order_id },
      correction_applied: true,
      queued: true,
    };
  }

  return await callFunction("correct-order", input);
}

export async function getOrderSummary(
  businessId: string,
  dateRange?: { start: string; end: string },
): Promise<SummaryResponse> {
  return await callFunction<SummaryResponse>("get-order-summary", {
    business_id: businessId,
    date_range: dateRange,
  });
}
