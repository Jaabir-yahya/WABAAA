import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp-send.ts";
import { getParserForBusiness } from "../../../packages/core/parsers/registry.ts";

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

const PRODUCT_PRICES: Record<string, number> = {
  sukari: 200,
  maziwa: 80,
  unga: 180,
  mafuta: 350,
  sabuni: 50,
  dawa: 150,
};

const PARSER_CONFIG = {
  parser_rules: {
    product_aliases: {
      sukari: ["sugar", "suka", "sucre"],
      maziwa: ["milk", "mziwa"],
      unga: ["flour", "uga"],
      mafuta: ["oil", "cooking oil"],
      sabuni: ["soap", "sabun"],
      dawa: ["medicine", "medication"],
    },
    unit_mappings: {
      kg: ["kilo", "kilogram", "kgs"],
      g: ["gram", "grams"],
      lita: ["litre", "liter", "litres", "l"],
      pcs: ["piece", "pieces", "pc"],
      packet: ["packets", "pkt", "pkts"],
    },
  },
};

function mergeParserConfig(config?: Record<string, unknown>) {
  const customRules = (config?.parser_rules as Record<string, unknown>) ?? {};
  const customAliases =
    (customRules.product_aliases as Record<string, string[]>) ?? {};
  const customUnits =
    (customRules.unit_mappings as Record<string, string[]>) ?? {};

  return {
    parser_rules: {
      product_aliases: {
        ...PARSER_CONFIG.parser_rules.product_aliases,
        ...customAliases,
      },
      unit_mappings: {
        ...PARSER_CONFIG.parser_rules.unit_mappings,
        ...customUnits,
      },
    },
  };
}

function calculateTotal(items: { product: string; quantity: number }[]) {
  return items.reduce((sum, item) => {
    const unitPrice = PRODUCT_PRICES[item.product] ?? 0;
    return sum + unitPrice * item.quantity;
  }, 0);
}

function formatItems(items: { product: string; quantity: number; unit?: string }[]) {
  return items
    .map((item) => `${item.product} ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`)
    .join(", ");
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

async function logOutboundMessage(
  supabase: any,
  {
    businessId,
    messageId,
    customerPhone,
    payload,
  }: {
    businessId: string;
    messageId: string;
    customerPhone: string;
    payload: Record<string, unknown>;
  },
) {
  await supabase.from("commerce_events").insert({
    business_id: businessId,
    event_type: "whatsapp_message_out",
    source_channel: "whatsapp",
    source_id: messageId,
    customer_phone: customerPhone,
    payload,
    idempotency_key: `whatsapp:out:${messageId}`,
    processing_status: "completed",
  });
}

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
  const businessId = DEFAULT_BUSINESS_ID;

  const { data: business } = await supabase
    .from("businesses")
    .select("business_type,config")
    .eq("id", businessId)
    .maybeSingle();

  const businessType = business?.business_type ?? "mini_supermarket";
  const ParserClass = getParserForBusiness(businessType);
  const parserConfig = mergeParserConfig(business?.config);
  const parser = new ParserClass(parserConfig);

  for (const message of messages) {
    await processMessage(supabase, message, {
      businessId,
      parser,
    });
  }
}

async function logPolicyViolation(
  supabase: any,
  {
    businessId,
    messageId,
    customerPhone,
    reason,
    occurredAt,
    details,
  }: {
    businessId: string;
    messageId: string;
    customerPhone: string;
    reason: string;
    occurredAt: string;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("commerce_events").insert({
    business_id: businessId,
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
  context: {
    businessId: string;
    parser: { parse: (text: string) => any };
  },
) {
  const messageId = message.id;
  const businessId = context.businessId;
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
      businessId,
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
      business_id: businessId,
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

  if (!autoResponseAllowed || !ALLOWED_MESSAGE_TYPES.has(message.type)) {
    return;
  }

  const parsed = context.parser.parse(messageText);
  const normalizedPhone = normalizePhone(customerPhone);

  if (parsed.type === "order" && parsed.data?.items?.length) {
    const items = parsed.data.items as Array<{
      product: string;
      quantity: number;
      unit?: string;
    }>;
    const total = calculateTotal(items);

    if (total <= 0) {
      await sendWhatsAppMessage({
        to: normalizedPhone,
        message:
          "Samahani, sijaelewa bidhaa. Tafadhali taja bidhaa na kiasi, mfano: sukari 2kg.",
      });
      lastAutoResponseAt.set(customerPhone, nowMs);
      await logOutboundMessage(supabase, {
        businessId,
        messageId,
        customerPhone,
        payload: {
          message_type: "order_unrecognized",
          parsed,
        },
      });
      return;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        business_id: businessId,
        customer_phone: customerPhone,
        total_amount: total,
        outstanding_amount: total,
        items,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      await sendWhatsAppMessage({
        to: normalizedPhone,
        message: "Samahani, kuna tatizo. Tafadhali jaribu tena baadaye.",
      });
      lastAutoResponseAt.set(customerPhone, nowMs);
      await logOutboundMessage(supabase, {
        businessId,
        messageId,
        customerPhone,
        payload: {
          message_type: "order_failed",
          error: orderError?.message ?? "Order insert failed",
        },
      });
      return;
    }

    const orderItems = formatItems(items);

    const paymentResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-payment-link`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
        },
        body: JSON.stringify({
          business_id: businessId,
          order_id: order.id,
        }),
      },
    );

    const paymentOk = paymentResponse.ok;
    const replyMessage = paymentOk
      ? `Asante! Oda yako: ${orderItems}\nJumla: KSh ${total.toLocaleString()}\nSubiri prompt ya M-Pesa kulipa.`
      : `Asante! Oda yako: ${orderItems}\nJumla: KSh ${total.toLocaleString()}\nTutakutumia maelezo ya malipo hivi karibuni.`;

    await sendWhatsAppMessage({
      to: normalizedPhone,
      message: replyMessage,
    });
    lastAutoResponseAt.set(customerPhone, nowMs);
    await logOutboundMessage(supabase, {
      businessId,
      messageId,
      customerPhone,
      payload: {
        message_type: "order_confirmation",
        order_id: order.id,
        total,
        items,
        payment_prompt_sent: paymentOk,
      },
    });
    return;
  }

  if (parsed.type === "payment") {
    await sendWhatsAppMessage({
      to: normalizedPhone,
      message:
        "Asante! Kama umelipa tayari, tutathibitisha malipo yako hivi karibuni.",
    });
    lastAutoResponseAt.set(customerPhone, nowMs);
    await logOutboundMessage(supabase, {
      businessId,
      messageId,
      customerPhone,
      payload: {
        message_type: "payment_ack",
        parsed,
      },
    });
    return;
  }

  await sendWhatsAppMessage({
    to: normalizedPhone,
    message:
      "Karibu! Tuma oda yako kwa mfano: sukari 2kg na maziwa 1 lita.",
  });
  lastAutoResponseAt.set(customerPhone, nowMs);
  await logOutboundMessage(supabase, {
    businessId,
    messageId,
    customerPhone,
    payload: {
      message_type: "order_prompt",
      parsed,
    },
  });
}

if (import.meta.main) {
  Deno.serve((req) => handleWebhookRequest(req));
}

export default handleWebhookRequest;
