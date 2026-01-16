import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createMpesaCallbackHandler } from "../mpesa-callback/index.ts";

type RecordRow = Record<string, unknown>;

function getFieldValue(row: RecordRow, field: string) {
  if (field.startsWith("payload->>")) {
    const key = field.slice("payload->>".length);
    const payload = row.payload as Record<string, unknown> | undefined;
    return payload?.[key];
  }
  return row[field];
}

class FakeQuery {
  private filters: Array<{ field: string; value: unknown }> = [];
  private pendingUpdate: Record<string, unknown> | null = null;

  constructor(
    private table: string,
    private store: Record<string, RecordRow[]>,
    private rpcState: { error: Error | null },
  ) {}

  select(_fields: string) {
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, value });
    if (this.pendingUpdate) {
      const rows = this.filterRows();
      for (const row of rows) {
        Object.assign(row, this.pendingUpdate);
      }
    }
    return this;
  }

  order(_field: string, _opts: Record<string, unknown>) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  async maybeSingle() {
    const rows = this.filterRows();
    return { data: rows[0] ?? null, error: null };
  }

  async insert(payload: RecordRow) {
    if (this.table === "payments" && this.rpcState.error) {
      return { error: this.rpcState.error };
    }
    this.store[this.table].push(payload);
    return { error: null };
  }

  update(values: Record<string, unknown>) {
    this.pendingUpdate = values;
    return this;
  }

  private filterRows() {
    return this.store[this.table].filter((row) =>
      this.filters.every(({ field, value }) => {
        const rowValue = getFieldValue(row, field);
        return rowValue === value;
      })
    );
  }
}

class FakeSupabase {
  public store: Record<string, RecordRow[]>;
  private rpcState: { error: Error | null };

  constructor(store: Record<string, RecordRow[]>, rpcError: Error | null = null) {
    this.store = store;
    this.rpcState = { error: rpcError };
  }

  from(table: string) {
    return new FakeQuery(table, this.store, this.rpcState);
  }

  schema(_schema: string) {
    return {
      rpc: async (_fn: string, args: { p_order_id: string; p_payment_amount: number }) => {
        if (this.rpcState.error) {
          return { data: null, error: this.rpcState.error };
        }
        const order = this.store.orders.find((row) => row.id === args.p_order_id);
        const outstanding = Number(order?.outstanding_amount ?? 0);
        const newOutstanding = Math.max(0, outstanding - args.p_payment_amount);
        return { data: [{ new_outstanding_amount: newOutstanding }], error: null };
      },
    };
  }
}

function buildPayload({
  checkoutRequestId,
  resultCode,
  amount,
  receipt,
  phone,
}: {
  checkoutRequestId: string;
  resultCode: number;
  amount: number;
  receipt: string;
  phone: string;
}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "29115-34620561-1",
        CheckoutRequestID: checkoutRequestId,
        ResultCode: resultCode,
        ResultDesc: "Processed",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: amount },
            { Name: "MpesaReceiptNumber", Value: receipt },
            { Name: "PhoneNumber", Value: phone },
            { Name: "TransactionDate", Value: 20260116120000 },
          ],
        },
      },
    },
  };
}

Deno.test("mpesa-callback handles successful payment", async () => {
  const store = {
    commerce_events: [
      {
        id: "evt-1",
        business_id: "elixosense",
        payload: {
          checkout_request_id: "chk-1",
          note_type: "mpesa_stk_initiated",
          order_id: "order-1",
        },
      },
    ],
    orders: [
      {
        id: "order-1",
        business_id: "elixosense",
        customer_phone: "254700000001",
        outstanding_amount: 1500,
      },
    ],
    payments: [],
  };
  const supabase = new FakeSupabase(store);
  const handler = createMpesaCallbackHandler(() => supabase as any);

  const payload = buildPayload({
    checkoutRequestId: "chk-1",
    resultCode: 0,
    amount: 1500,
    receipt: "TEST12345",
    phone: "254700000001",
  });
  const req = new Request("http://localhost/mpesa-callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(store.payments.length, 1);

  const callbackEvent = store.commerce_events.find((event) =>
    event.event_type === "mpesa_payment_callback"
  );
  assertEquals(callbackEvent?.payload?.result_code, "0");
  assertEquals(callbackEvent?.payload?.applied_amount, 1500);
});

Deno.test("mpesa-callback logs failure without inserting payment", async () => {
  const store = {
    commerce_events: [
      {
        id: "evt-1",
        business_id: "elixosense",
        payload: {
          checkout_request_id: "chk-fail",
          note_type: "mpesa_stk_initiated",
          order_id: "order-2",
        },
      },
    ],
    orders: [
      {
        id: "order-2",
        business_id: "elixosense",
        customer_phone: "254700000002",
        outstanding_amount: 800,
      },
    ],
    payments: [],
  };
  const supabase = new FakeSupabase(store);
  const handler = createMpesaCallbackHandler(() => supabase as any);

  const payload = buildPayload({
    checkoutRequestId: "chk-fail",
    resultCode: 1032,
    amount: 800,
    receipt: "FAIL12345",
    phone: "254700000002",
  });
  const req = new Request("http://localhost/mpesa-callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(store.payments.length, 0);

  const callbackEvent = store.commerce_events.find((event) =>
    event.event_type === "mpesa_payment_callback"
  );
  assertEquals(callbackEvent?.payload?.result_code, "1032");
  assertEquals(callbackEvent?.processing_status, "failed");
});

Deno.test("mpesa-callback ignores duplicate callbacks", async () => {
  const store = {
    commerce_events: [
      {
        id: "evt-1",
        business_id: "elixosense",
        idempotency_key: "mpesa:callback:dup-1",
        payload: {
          checkout_request_id: "dup-1",
          note_type: "mpesa_stk_initiated",
          order_id: "order-3",
        },
      },
    ],
    orders: [
      {
        id: "order-3",
        business_id: "elixosense",
        customer_phone: "254700000003",
        outstanding_amount: 500,
      },
    ],
    payments: [],
  };
  const supabase = new FakeSupabase(store);
  const handler = createMpesaCallbackHandler(() => supabase as any);

  const payload = buildPayload({
    checkoutRequestId: "dup-1",
    resultCode: 0,
    amount: 500,
    receipt: "DUP12345",
    phone: "254700000003",
  });
  const req = new Request("http://localhost/mpesa-callback", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(store.payments.length, 0);
  assertEquals(
    store.commerce_events.filter((event) =>
      event.event_type === "mpesa_payment_callback"
    ).length,
    0,
  );
});
