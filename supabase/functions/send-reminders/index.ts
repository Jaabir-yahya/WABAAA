import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { parseJson, ensureBusinessActive } from "../_shared/auth.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp-send.ts";
import { sendPaymentReminder } from "../_shared/sms.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ReminderRequest = {
  business_id: string;
  days_overdue?: number;
  limit?: number;
};

function getNairobiDayKey(date: Date = new Date()) {
  const offsetMs = 3 * 60 * 60 * 1000;
  const nairobiNow = new Date(date.getTime() + offsetMs);
  return nairobiNow.toISOString().slice(0, 10);
}

function getNairobiDayStart(date: Date = new Date()) {
  const offsetMs = 3 * 60 * 60 * 1000;
  const nairobiNow = new Date(date.getTime() + offsetMs);
  const startNairobi = new Date(nairobiNow);
  startNairobi.setUTCHours(0, 0, 0, 0);
  return new Date(startNairobi.getTime() - offsetMs);
}

async function logReminderEvent(params: {
  businessId: string;
  orderId: string;
  customerPhone: string;
  channel: "whatsapp" | "sms";
  status: "completed" | "failed";
  error?: string | null;
}) {
  const supabase = getSupabaseClient();
  const dayKey = getNairobiDayKey();

  await supabase.from("commerce_events").insert({
    business_id: params.businessId,
    event_type: "merchant_note",
    source_channel: params.channel,
    source_id: params.orderId,
    customer_phone: params.customerPhone,
    payload: {
      note_type: "payment_reminder",
      order_id: params.orderId,
      channel: params.channel,
      error: params.error ?? null,
      day: dayKey,
    },
    idempotency_key: `reminder:${params.orderId}:${dayKey}:${params.channel}`,
    processing_status: params.status,
  });
}

export async function handleRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const input = await parseJson<ReminderRequest>(req);
    if (!input.business_id) {
      throw new HttpError(400, "Missing business_id");
    }

    await ensureBusinessActive(input.business_id);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `send-reminders:${input.business_id}:${ipAddress}`,
      max: 5,
      windowMs: 60_000,
      businessId: input.business_id,
      action: "send-reminders",
      ipAddress,
      userAgent,
    });

    const daysOverdue = Math.max(1, input.days_overdue ?? 2);
    const limit = Math.min(50, Math.max(1, input.limit ?? 25));

    const cutoff = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);
    const dayStart = getNairobiDayStart();

    const supabase = getSupabaseClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id,customer_phone,customer_name,outstanding_amount,created_at,status")
      .eq("business_id", input.business_id)
      .in("status", ["pending", "partial"])
      .gt("outstanding_amount", 0)
      .lte("created_at", cutoff.toISOString())
      .order("outstanding_amount", { ascending: false })
      .limit(limit);

    if (error) {
      throw new HttpError(500, "Failed to load overdue orders", {
        message: error.message,
      });
    }

    let sent = 0;
    let skipped = 0;
    const results: Array<{ order_id: string; channel: string; status: string }> = [];

    for (const order of orders ?? []) {
      const { data: existingReminder } = await supabase
        .from("commerce_events")
        .select("id")
        .eq("payload->>note_type", "payment_reminder")
        .eq("payload->>order_id", order.id)
        .gte("occurred_at", dayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (existingReminder) {
        skipped += 1;
        continue;
      }

      const amount = Number(order.outstanding_amount ?? 0);
      const customerName = order.customer_name ?? order.customer_phone;
      const message =
        `Habari ${customerName}! Una deni ya KSh ${amount.toLocaleString("en-KE")}. ` +
        `Tafadhali lipa ili tukutumikie.`;

      const whatsapp = await sendWhatsAppMessage({
        to: order.customer_phone,
        message,
      });

      if (whatsapp.success) {
        await logReminderEvent({
          businessId: input.business_id,
          orderId: order.id,
          customerPhone: order.customer_phone,
          channel: "whatsapp",
          status: "completed",
        });
        sent += 1;
        results.push({ order_id: order.id, channel: "whatsapp", status: "sent" });
        continue;
      }

      await logReminderEvent({
        businessId: input.business_id,
        orderId: order.id,
        customerPhone: order.customer_phone,
        channel: "whatsapp",
        status: "failed",
        error: whatsapp.error ?? "WhatsApp send failed",
      });

      await sendPaymentReminder({
        customerPhone: order.customer_phone,
        customerName,
        amount,
        orderId: order.id,
        businessId: input.business_id,
      });

      sent += 1;
      results.push({ order_id: order.id, channel: "sms", status: "sent" });
    }

    return jsonResponse(
      {
        success: true,
        sent,
        skipped,
        total: orders?.length ?? 0,
        results,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleRequest(req));
}

export default handleRequest;
