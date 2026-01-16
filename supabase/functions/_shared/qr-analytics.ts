import { getSupabaseClient } from "./db.ts";

export async function logQRScan(params: {
  businessId: string;
  qrType: string;
  scannerPhone?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();

  await supabase.from("commerce_events").insert({
    business_id: params.businessId,
    event_type: "merchant_note",
    source_channel: "qr",
    customer_phone: params.scannerPhone ?? null,
    payload: {
      note_type: "qr_scan",
      qr_type: params.qrType,
      metadata: params.metadata ?? null,
      scanned_at: new Date().toISOString(),
    },
    processing_status: "completed",
  });
}

export async function logQRConversion(params: {
  businessId: string;
  orderId: string;
  amount: number;
  productId?: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();

  await supabase.from("commerce_events").insert({
    business_id: params.businessId,
    event_type: "merchant_note",
    source_channel: "qr",
    payload: {
      note_type: "qr_conversion",
      order_id: params.orderId,
      amount: params.amount,
      product_id: params.productId ?? null,
      quantity: params.quantity ?? null,
      metadata: params.metadata ?? null,
      converted_at: new Date().toISOString(),
    },
    processing_status: "completed",
  });
}
