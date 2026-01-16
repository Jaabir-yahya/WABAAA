import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { logQRScan } from "../_shared/qr-analytics.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type BusinessRecord = {
  id: string;
  name: string;
  business_type?: string | null;
  whatsapp_number?: string | null;
  owner_phone: string;
};

function getBusinessPhone(business: BusinessRecord) {
  return business.whatsapp_number ?? business.owner_phone;
}

async function getBusiness(
  supabase: ReturnType<typeof getSupabaseClient>,
  businessId: string,
): Promise<BusinessRecord> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,business_type,whatsapp_number,owner_phone")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) {
    throw new HttpError(404, "Business not found");
  }

  return data as BusinessRecord;
}

function formatWhatsAppMessage(message: string) {
  return encodeURIComponent(message.trim());
}

async function handleOrderQR(
  supabase: ReturnType<typeof getSupabaseClient>,
  business: BusinessRecord,
  data: string,
) {
  const [productId, quantityRaw, unitRaw] = data.split(":");
  const quantity = Number(quantityRaw ?? 1);
  const unit = unitRaw ?? "pcs";

  await logQRScan({
    businessId: business.id,
    qrType: "product_qr",
    metadata: { product_id: productId, quantity, unit },
  });

  const whatsappNumber = getBusinessPhone(business);
  const message =
    `Nataka ${productId} ${quantity}${unit} kupitia QR`;

  return Response.redirect(
    `https://wa.me/${whatsappNumber}?text=${formatWhatsAppMessage(message)}`,
    302,
  );
}

async function handlePaymentQR(
  business: BusinessRecord,
  data: string,
) {
  const [orderId, amountRaw] = data.split(":");
  const amount = Number(amountRaw ?? 0);

  await logQRScan({
    businessId: business.id,
    qrType: "invoice_qr",
    metadata: { order_id: orderId, amount },
  });

  const whatsappNumber = getBusinessPhone(business);
  const message = `Nataka kulipa oda ${orderId} KSh ${amount}`;

  return Response.redirect(
    `https://wa.me/${whatsappNumber}?text=${formatWhatsAppMessage(message)}`,
    302,
  );
}

async function handleChatQR(business: BusinessRecord) {
  await logQRScan({
    businessId: business.id,
    qrType: "shop_qr",
  });

  const whatsappNumber = getBusinessPhone(business);
  const message = `Habari! Nimeona QR code ya ${business.name}`;

  return Response.redirect(
    `https://wa.me/${whatsappNumber}?text=${formatWhatsAppMessage(message)}`,
    302,
  );
}

async function handleMenuQR(
  supabase: ReturnType<typeof getSupabaseClient>,
  business: BusinessRecord,
) {
  await logQRScan({
    businessId: business.id,
    qrType: "menu_qr",
  });

  const whatsappNumber = getBusinessPhone(business);
  if (business.business_type === "restaurant") {
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("name,base_price,available")
      .eq("business_id", business.id)
      .eq("available", true)
      .limit(15);

    const menuText = (menuItems ?? [])
      .map((item) => `${item.name} - KSh ${item.base_price}`)
      .join("\n");
    const message = menuText.length > 0 ? menuText : "MENU";
    return Response.redirect(
      `https://wa.me/${whatsappNumber}?text=${formatWhatsAppMessage(message)}`,
      302,
    );
  }

  return Response.redirect(
    `https://wa.me/${whatsappNumber}?text=MENU`,
    302,
  );
}

function ensureQRPath(pathname: string) {
  const marker = "/qr/";
  const index = pathname.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return pathname.slice(index + marker.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const qrPath = ensureQRPath(url.pathname);
    if (!qrPath) {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    const [businessId, action, ...rest] = qrPath.split("/");
    const encodedData = rest.join("/");
    if (!businessId || !action) {
      throw new HttpError(400, "Invalid QR path");
    }

    const data = decodeURIComponent(encodedData);
    const supabase = getSupabaseClient();
    const business = await getBusiness(supabase, businessId);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `qr-scan:${businessId}:${ipAddress}`,
      max: 60,
      windowMs: 60_000,
      businessId,
      action: `qr-${action}`,
      ipAddress,
      userAgent,
    });

    switch (action) {
      case "order":
        return await handleOrderQR(supabase, business, data);
      case "pay":
        return await handlePaymentQR(business, data);
      case "chat":
        return await handleChatQR(business);
      case "menu":
        return await handleMenuQR(supabase, business);
      default:
        return Response.redirect(
          `https://wa.me/${getBusinessPhone(business)}`,
          302,
        );
    }
  } catch (error) {
    return errorResponse(error);
  }
});
