import { getSupabaseClient } from "./db.ts";
import { HttpError } from "./errors.ts";

type SmsResult = {
  success: boolean;
  error?: string;
};

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Missing ${name} environment variable`);
  }
  return value;
}

function normalizeKenyanPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) {
    return phone;
  }
  if (digits.startsWith("254")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith("7") && digits.length === 9) {
    return `+254${digits}`;
  }
  return phone;
}

async function logSmsEvent(params: {
  businessId: string;
  to: string;
  message: string;
  eventType: string;
  status: "completed" | "failed";
  error?: string | null;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = getSupabaseClient();
  await supabase.from("commerce_events").insert({
    business_id: params.businessId,
    event_type: "merchant_note",
    source_channel: "sms",
    source_id: params.eventType,
    customer_phone: params.to,
    payload: {
      note_type: params.eventType,
      message: params.message,
      sms_sent: params.status === "completed",
      sms_error: params.error ?? null,
      ...params.metadata,
    },
    idempotency_key: params.idempotencyKey ?? null,
    processing_status: params.status,
  });
}

export async function sendSMS(params: {
  to: string;
  message: string;
  businessId: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<SmsResult> {
  const apiKey = getEnv("AFRICASTALKING_API_KEY");
  const username = getEnv("AFRICASTALKING_USERNAME");
  const senderId = Deno.env.get("SMS_SENDER_ID");

  const to = normalizeKenyanPhone(params.to);
  const body = new URLSearchParams({
    username,
    to,
    message: params.message,
  });

  if (senderId) {
    body.set("from", senderId);
  }

  const response = await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apiKey,
    },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = data?.SMSMessageData?.Message ?? "Failed to send SMS";
    await logSmsEvent({
      businessId: params.businessId,
      to,
      message: params.message,
      eventType: "sms_send",
      status: "failed",
      error,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
    });
    return { success: false, error };
  }

  await logSmsEvent({
    businessId: params.businessId,
    to,
    message: params.message,
    eventType: "sms_send",
    status: "completed",
    idempotencyKey: params.idempotencyKey,
    metadata: params.metadata,
  });

  return { success: true };
}

async function getBusinessMpesaShortcode(businessId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("config,mpesa_shortcode")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    throw new HttpError(500, "Failed to load business config");
  }

  const config = (data as { config?: Record<string, unknown>; mpesa_shortcode?: string })
    .config ?? {};
  const mpesaConfig = (config as Record<string, unknown>).mpesa as
    | { shortcode?: string }
    | undefined;
  const shortcode = mpesaConfig?.shortcode ?? data.mpesa_shortcode;

  if (!shortcode) {
    throw new HttpError(500, "M-Pesa shortcode not configured");
  }

  return shortcode;
}

export async function sendPaymentReminder(params: {
  customerPhone: string;
  customerName: string;
  amount: number;
  orderId: string;
  businessId: string;
}): Promise<void> {
  const shortcode = await getBusinessMpesaShortcode(params.businessId);
  const message =
    `Habari ${params.customerName}! Una deni ya KSh ${params.amount.toLocaleString("en-KE")}. ` +
    `Tafadhali lipa kwa M-Pesa ${shortcode}.`;

  await sendSMS({
    to: params.customerPhone,
    message,
    businessId: params.businessId,
    idempotencyKey: `sms:reminder:${params.orderId}`,
    metadata: {
      order_id: params.orderId,
      reminder_type: "payment_reminder",
    },
  });
}

export async function sendOrderConfirmationSMS(params: {
  customerPhone: string;
  items: string;
  total: number;
  businessId: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}): Promise<SmsResult> {
  const message =
    `Asante! Oda yako: ${params.items}\n` +
    `Jumla: KSh ${params.total.toLocaleString("en-KE")}.`;

  return await sendSMS({
    to: params.customerPhone,
    message,
    businessId: params.businessId,
    idempotencyKey: params.orderId ? `sms:order:${params.orderId}` : undefined,
    metadata: {
      order_id: params.orderId,
      message_type: "order_confirmation",
      ...(params.metadata ?? {}),
    },
  });
}
