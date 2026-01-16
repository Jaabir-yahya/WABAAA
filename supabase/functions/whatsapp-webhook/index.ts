import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata?: { phone_number_id?: string };
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DEFAULT_BUSINESS_ID = "elixosense";
const ALLOWED_MESSAGE_TYPES = new Set(["text"]);
const RATE_LIMIT_MESSAGES = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AUTO_RESPONSE_COOLDOWN_MS = 5 * 60 * 1000;

const customerMessageTimestamps = new Map<string, number[]>();
const lastAutoResponseAt = new Map<string, number>();

function hexToBytes(hex: string) {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return result;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function getNairobiHour(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    hour12: false,
  });
  return Number(formatter.format(date));
}

function isBusinessHours(date: Date = new Date()) {
  const hour = getNairobiHour(date);
  return hour >= 7 && hour < 20;
}

function isRateLimited(customerPhone: string, nowMs: number = Date.now()) {
  const windowStart = nowMs - RATE_LIMIT_WINDOW_MS;
  const timestamps = customerMessageTimestamps.get(customerPhone) ?? [];
  const recent = timestamps.filter((ts) => ts >= windowStart);
  recent.push(nowMs);
  customerMessageTimestamps.set(customerPhone, recent);
  return recent.length > RATE_LIMIT_MESSAGES;
}

function isAutoResponseCooldownSatisfied(
  customerPhone: string,
  nowMs: number = Date.now(),
) {
  const lastSentAt = lastAutoResponseAt.get(customerPhone) ?? 0;
  return nowMs - lastSentAt >= AUTO_RESPONSE_COOLDOWN_MS;
}

export async function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string | null,
) {
  if (!appSecret) {
    console.warn(
      "WhatsApp app secret not configured. Signature verification disabled.",
    );
    return true;
  }

  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const theirHex = signature.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );

  const expectedBytes = new Uint8Array(expected);
  const theirBytes = hexToBytes(theirHex);

  return timingSafeEqual(expectedBytes, theirBytes);
}

export function extractMessages(payload: WhatsAppWebhookPayload) {
  const messages: WhatsAppMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.value?.messages?.length) {
        messages.push(...change.value.messages);
      }
    }
  }
  return messages;
}

export async function handleWebhookRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

      if (mode === "subscribe" && token && token === expectedToken) {
        return new Response(challenge ?? "", { status: 200 });
      }

      return new Response("Forbidden", { status: 403 });
    }

    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? null;

    const verified = await verifyMetaSignature(rawBody, signature, appSecret);
    if (!verified) {
      throw new HttpError(401, "Invalid signature");
    }

    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    } catch (_error) {
      throw new HttpError(400, "Invalid JSON");
    }

    try {
      await processWhatsAppMessages(payload);
    } catch (error) {
      console.error("Failed to process WhatsApp messages", error);
    }

    return jsonResponse({ status: "ok" }, 200, corsHeaders);
  } catch (error) {
    return errorResponse(error);
  }
}

async function processWhatsAppMessages(payload: WhatsAppWebhookPayload) {
  const supabase = getSupabaseClient();
  const messages = extractMessages(payload);

  for (const message of messages) {
    await processMessage(supabase, message);
  }
}

async function logPolicyViolation(
  supabase: any,
  {
    messageId,
    customerPhone,
    reason,
    occurredAt,
    details,
  }: {
    messageId: string;
    customerPhone: string;
    reason: string;
    occurredAt: string;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("commerce_events").insert({
    business_id: DEFAULT_BUSINESS_ID,
    event_type: "merchant_note",
    source_channel: "whatsapp",
    source_id: messageId,
    customer_phone: customerPhone,
    payload: {
      note_type: "whatsapp_policy_guard",
      reason,
      ...details,
    },
    idempotency_key: `policy:${messageId}:${reason}`,
    occurred_at: occurredAt,
    processing_status: "completed",
  });

  if (error) {
    console.warn("Failed to log policy violation", error.message);
  }
}

export async function processMessage(
  supabase: any,
  message: WhatsAppMessage,
) {
  const messageId = message.id;
  const customerPhone = message.from;
  const messageText = message.text?.body ?? "";
  const policyViolations: string[] = [];
  const nowMs = Date.now();
  const withinBusinessHours = isBusinessHours();
  const autoResponseAllowed = withinBusinessHours &&
    isAutoResponseCooldownSatisfied(customerPhone, nowMs);

  if (!ALLOWED_MESSAGE_TYPES.has(message.type)) {
    policyViolations.push("non_text_message");
  }

  if (isRateLimited(customerPhone, nowMs)) {
    policyViolations.push("rate_limited");
  }

  if (!withinBusinessHours) {
    policyViolations.push("outside_business_hours");
  }

  const occurredAt = new Date(Number(message.timestamp) * 1000).toISOString();

  const { data: existing, error: existingError } = await supabase
    .from("commerce_events")
    .select("id")
    .eq("source_id", messageId)
    .eq("event_type", "whatsapp_message_in")
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return;
  }

  for (const violation of policyViolations) {
    await logPolicyViolation(supabase, {
      messageId,
      customerPhone,
      reason: violation,
      occurredAt,
      details: {
        message_type: message.type,
        auto_response_allowed: autoResponseAllowed,
      },
    });
  }

  const { error: insertError } = await supabase
    .from("commerce_events")
    .insert({
      business_id: DEFAULT_BUSINESS_ID,
      event_type: "whatsapp_message_in",
      source_channel: "whatsapp",
      source_id: messageId,
      customer_phone: customerPhone,
      payload: {
        message_id: messageId,
        from: customerPhone,
        message_type: message.type,
        text: messageText,
        timestamp: message.timestamp,
        received_at: occurredAt,
        policy_violations: policyViolations,
        auto_response_allowed: autoResponseAllowed,
      },
      idempotency_key: `whatsapp:${messageId}`,
      occurred_at: occurredAt,
      processing_status: policyViolations.length ? "policy_flagged" : "completed",
    });

  if (insertError) {
    throw new Error(insertError.message);
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleWebhookRequest(req));
}

export default handleWebhookRequest;
