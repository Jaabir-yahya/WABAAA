import { create } from "qrcode";
import { getSupabaseClient } from "../_shared/db.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type QRType = "product" | "invoice" | "shop" | "menu";

type GenerateRequest = {
  businessId: string;
  type: QRType;
  data?: Record<string, unknown>;
};

type BusinessRecord = {
  id: string;
  name: string;
  business_type?: string | null;
  whatsapp_number?: string | null;
  owner_phone: string;
  mpesa_shortcode?: string | null;
  mpesa_paybill?: string | null;
  mpesa_till_number?: string | null;
  config?: Record<string, unknown> | null;
};

type QRMetadata = {
  business_id: string;
  type: QRType;
  amount?: number;
  product_id?: string;
  quantity?: number;
  unit?: string;
  order_id?: string;
  mpesa_reference?: string;
  whatsapp_fallback?: string;
  ussd_fallback?: string;
};

function getBaseUrl() {
  const baseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
  if (!baseUrl) {
    throw new HttpError(500, "Missing SUPABASE_URL");
  }
  return baseUrl;
}

async function getBusiness(
  supabase: ReturnType<typeof getSupabaseClient>,
  businessId: string,
): Promise<BusinessRecord> {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id,name,business_type,whatsapp_number,owner_phone,mpesa_shortcode,mpesa_paybill,mpesa_till_number,config",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) {
    throw new HttpError(404, "Business not found");
  }

  return data as BusinessRecord;
}

function encodeQrMetadata(metadata: QRMetadata) {
  const payload = {
    b: metadata.business_id,
    t: metadata.type,
    p: metadata.product_id,
    q: metadata.quantity,
    u: metadata.unit,
    a: metadata.amount,
    o: metadata.order_id,
    ts: Date.now(),
  };
  const encoded = btoa(JSON.stringify(payload));
  return `KCOS:${encoded}`;
}

function getBusinessPhone(business: BusinessRecord) {
  return business.whatsapp_number ?? business.owner_phone;
}

function formatWhatsAppMessage(message: string) {
  return encodeURIComponent(message.trim());
}

async function generateProductQR(
  business: BusinessRecord,
  data: Record<string, unknown>,
) {
  const productId = String(data.productId ?? data.product ?? "").trim();
  if (!productId) {
    throw new HttpError(400, "Missing productId");
  }

  const quantity = Number(data.quantity ?? 1);
  const unit = String(data.unit ?? "pcs");
  const config = (business.config ?? {}) as Record<string, unknown>;
  const productPrices =
    (config.product_prices as Record<string, number>) ?? {};
  const basePrice = Number(data.amount ?? productPrices[productId] ?? 0);
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new HttpError(400, "Missing product price");
  }
  const amount = basePrice * quantity;

  const mpesaReference = encodeQrMetadata({
    business_id: business.id,
    type: "product",
    product_id: productId,
    quantity,
    unit,
    amount,
  });

  const baseUrl = getBaseUrl();
  const qrData =
    `${baseUrl}/functions/v1/qr-processor/qr/${business.id}/order/` +
    `${encodeURIComponent(`${productId}:${quantity}:${unit}`)}`;

  const whatsappNumber = getBusinessPhone(business);
  const whatsappMessage =
    `Nataka ${productId} ${quantity}${unit} kupitia QR`;

  const metadata: QRMetadata = {
    business_id: business.id,
    type: "product",
    product_id: productId,
    quantity,
    unit,
    amount,
    mpesa_reference: mpesaReference,
    whatsapp_fallback: `https://wa.me/${whatsappNumber}?text=${
      formatWhatsAppMessage(whatsappMessage)
    }`,
    ussd_fallback: business.mpesa_shortcode
      ? `*144*${business.mpesa_shortcode}*${productId}*${quantity}#`
      : undefined,
  };

  return { qrData, metadata };
}

async function generateInvoiceQR(
  business: BusinessRecord,
  data: Record<string, unknown>,
) {
  const orderId = String(data.orderId ?? "").trim();
  if (!orderId) {
    throw new HttpError(400, "Missing orderId");
  }

  const supabase = getSupabaseClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,outstanding_amount,customer_phone")
    .eq("id", orderId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error || !order) {
    throw new HttpError(404, "Order not found");
  }

  const amount = Number(order.outstanding_amount ?? 0);
  if (amount <= 0) {
    throw new HttpError(400, "Order has no outstanding balance");
  }

  const mpesaReference = encodeQrMetadata({
    business_id: business.id,
    type: "invoice",
    order_id: orderId,
    amount,
  });

  const baseUrl = getBaseUrl();
  const qrData =
    `${baseUrl}/functions/v1/qr-processor/qr/${business.id}/pay/` +
    `${encodeURIComponent(`${orderId}:${amount}`)}`;

  const whatsappNumber = getBusinessPhone(business);
  const whatsappMessage = `Nataka kulipa oda ${orderId} KSh ${amount}`;

  const metadata: QRMetadata = {
    business_id: business.id,
    type: "invoice",
    order_id: orderId,
    amount,
    mpesa_reference: mpesaReference,
    whatsapp_fallback: `https://wa.me/${whatsappNumber}?text=${
      formatWhatsAppMessage(whatsappMessage)
    }`,
  };

  return { qrData, metadata };
}

async function generateShopQR(business: BusinessRecord) {
  const baseUrl = getBaseUrl();
  const qrData =
    `${baseUrl}/functions/v1/qr-processor/qr/${business.id}/chat/welcome`;

  const whatsappNumber = getBusinessPhone(business);
  const metadata: QRMetadata = {
    business_id: business.id,
    type: "shop",
    whatsapp_fallback: `https://wa.me/${whatsappNumber}`,
  };

  return { qrData, metadata };
}

async function generateMenuQR(business: BusinessRecord) {
  const baseUrl = getBaseUrl();
  const qrData =
    `${baseUrl}/functions/v1/qr-processor/qr/${business.id}/menu/main`;

  const whatsappNumber = getBusinessPhone(business);
  const metadata: QRMetadata = {
    business_id: business.id,
    type: "menu",
    whatsapp_fallback: `https://wa.me/${whatsappNumber}?text=MENU`,
  };

  return { qrData, metadata };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = (await req.json()) as GenerateRequest;
    if (!body.businessId || !body.type) {
      throw new HttpError(400, "Missing businessId or type");
    }

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `qr:${body.businessId}:${ipAddress}`,
      max: 30,
      windowMs: 60_000,
      businessId: body.businessId,
      action: "generate-qr",
      ipAddress,
      userAgent,
    });

    const supabase = getSupabaseClient();
    const business = await getBusiness(supabase, body.businessId);

    let qrData = "";
    let metadata: QRMetadata | undefined;

    switch (body.type) {
      case "product": {
        const result = await generateProductQR(business, body.data ?? {});
        qrData = result.qrData;
        metadata = result.metadata;
        break;
      }
      case "invoice": {
        const result = await generateInvoiceQR(business, body.data ?? {});
        qrData = result.qrData;
        metadata = result.metadata;
        break;
      }
      case "shop": {
        const result = await generateShopQR(business);
        qrData = result.qrData;
        metadata = result.metadata;
        break;
      }
      case "menu": {
        const result = await generateMenuQR(business);
        qrData = result.qrData;
        metadata = result.metadata;
        break;
      }
      default:
        throw new HttpError(400, "Invalid QR type");
    }

    const qrSvg = await create(qrData, {
      errorCorrectionLevel: "H",
      type: "svg",
      margin: 1,
    });

    return jsonResponse(
      {
        qr_svg: qrSvg,
        qr_data: qrData,
        metadata,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
