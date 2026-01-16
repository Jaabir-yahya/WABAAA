import { HttpError } from "./errors.ts";

type SendWhatsAppResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Missing ${name} environment variable`);
  }
  return value;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export async function sendWhatsAppMessage(params: {
  to: string;
  message: string;
}): Promise<SendWhatsAppResult> {
  const phoneNumberId = getEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = getEnv("WHATSAPP_ACCESS_TOKEN");

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(params.to),
        type: "text",
        text: { body: params.message },
      }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      error: data?.error?.message ?? "Failed to send WhatsApp message",
    };
  }

  return {
    success: true,
    messageId: data?.messages?.[0]?.id,
  };
}
