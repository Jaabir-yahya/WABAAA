import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { sendWhatsAppMessage } from "../_shared/whatsapp-send.ts";
import { sendSMS, sendPaymentReminder } from "../_shared/sms.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_BUSINESS_ID = "elixosense";

function getNairobiDayBounds() {
  const offsetMs = 3 * 60 * 60 * 1000;
  const now = new Date();
  const nairobiNow = new Date(now.getTime() + offsetMs);
  const startNairobi = new Date(nairobiNow);
  startNairobi.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(startNairobi.getTime() - offsetMs);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

type DailySummaryRequest = {
  business_id?: string;
  send_reminders?: boolean;
  reminder_days_overdue?: number;
  reminder_limit?: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const supabase = getSupabaseClient();
    const { startUtc, endUtc } = getNairobiDayBounds();
    const input = (await req.json().catch(() => ({}))) as DailySummaryRequest;
    const businessId = input.business_id ?? DEFAULT_BUSINESS_ID;

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `daily-summary:${businessId}:${ipAddress}`,
      max: 5,
      windowMs: 60_000,
      businessId,
      action: "daily-summary",
      ipAddress,
      userAgent,
    });

    const [{ data: payments }, { data: orders }] = await Promise.all([
          supabase
        .from("payments")
        .select("applied_amount,created_at")
            .eq("business_id", businessId)
        .gte("created_at", startUtc.toISOString())
        .lt("created_at", endUtc.toISOString())
        .eq("status", "confirmed"),
          supabase
            .from("orders")
            .select("id,outstanding_amount,status,created_at,customer_phone,customer_name")
            .eq("business_id", businessId)
        .gte("created_at", startUtc.toISOString())
        .lt("created_at", endUtc.toISOString()),
    ]);

    const totalRevenue = (payments ?? []).reduce(
      (sum, payment) => sum + Number(payment.applied_amount ?? 0),
      0,
    );

    const totalOrders = orders?.length ?? 0;
    const pendingOrders = (orders ?? []).filter((order) =>
      order.status === "pending" || order.status === "partial"
    );
    const pendingCount = pendingOrders.length;
    const pendingAmount = pendingOrders.reduce(
      (sum, order) => sum + Number(order.outstanding_amount ?? 0),
      0,
    );

    const summaryMessage = `ElixoSense Leo:\n` +
      `Mapato: KSh ${totalRevenue.toLocaleString()}\n` +
      `Oda: ${totalOrders}\n` +
      `Zinasubiri: ${pendingCount} (KSh ${pendingAmount.toLocaleString()})`;

    const ownerPhone = Deno.env.get("BUSINESS_OWNER_PHONE");
    const smsResult = ownerPhone
      ? await sendSMS({
          to: ownerPhone,
          message: summaryMessage,
          businessId,
          idempotencyKey: `daily_summary:sms:${startUtc.toISOString().slice(0, 10)}`,
        })
      : { success: false, error: "BUSINESS_OWNER_PHONE not configured" };

    let whatsappResult: { success: boolean; error?: string } = {
      success: false,
      error: "WhatsApp not configured",
    };

    if (ownerPhone) {
      try {
        const whatsapp = await sendWhatsAppMessage({
          to: ownerPhone,
          message: summaryMessage,
        });
        whatsappResult = {
          success: whatsapp.success,
          error: whatsapp.success ? undefined : whatsapp.error,
        };
      } catch (error) {
        whatsappResult = {
          success: false,
          error: error instanceof Error ? error.message : "WhatsApp send failed",
        };
      }
    }

    let remindersSent = 0;
    if (input.send_reminders && pendingOrders.length > 0) {
      const reminderLimit = Math.min(
        50,
        Math.max(1, input.reminder_limit ?? 10),
      );
      const daysOverdue = Math.max(1, input.reminder_days_overdue ?? 2);
      const reminderCutoff = new Date(
        Date.now() - daysOverdue * 24 * 60 * 60 * 1000,
      );

      const overdueOrders = pendingOrders
        .filter((order) => new Date(order.created_at) <= reminderCutoff)
        .slice(0, reminderLimit);

      for (const order of overdueOrders) {
        await sendPaymentReminder({
          customerPhone: order.customer_phone ?? "",
          customerName: order.customer_name ?? order.customer_phone ?? "Mteja",
          amount: Number(order.outstanding_amount ?? 0),
          orderId: order.id,
          businessId,
        });
        remindersSent += 1;
      }
    }

    await supabase.from("commerce_events").insert({
      business_id: businessId,
      event_type: "merchant_note",
      source_channel: "sms",
      payload: {
        note_type: "daily_summary",
        message: summaryMessage,
        sms_sent: smsResult.success,
        sms_error: smsResult.success ? null : smsResult.error,
        whatsapp_sent: whatsappResult.success,
        whatsapp_error: whatsappResult.success ? null : whatsappResult.error,
        reminders_sent: remindersSent,
      },
      idempotency_key: `daily_summary:${startUtc.toISOString().slice(0, 10)}`,
      processing_status: smsResult.success || whatsappResult.success
        ? "completed"
        : "failed",
    });

    return jsonResponse(
      {
        success: true,
        summary: {
          revenue: totalRevenue,
          orders: totalOrders,
          pending_count: pendingCount,
          pending_amount: pendingAmount,
        },
        sms_sent: smsResult.success,
        sms_error: smsResult.success ? null : smsResult.error,
        whatsapp_sent: whatsappResult.success,
        whatsapp_error: whatsappResult.success ? null : whatsappResult.error,
        reminders_sent: remindersSent,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
