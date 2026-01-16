import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractMessages,
  handleWebhookRequest,
  verifyMetaSignature,
} from "../whatsapp-webhook/index.ts";

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `sha256=${Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

Deno.test("verifyMetaSignature accepts valid signature", async () => {
  const secret = "test-secret";
  const body = JSON.stringify({ ok: true });
  const signature = await signPayload(body, secret);

  const result = await verifyMetaSignature(body, signature, secret);
  assertEquals(result, true);
});

Deno.test("extractMessages flattens webhook payload", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              messages: [
                {
                  id: "msg-1",
                  from: "254712345678",
                  timestamp: "1700000000",
                  type: "text",
                  text: { body: "Nataka 2kg sukari" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const messages = extractMessages(payload);
  assertEquals(messages.length, 1);
  assertEquals(messages[0].id, "msg-1");
});

Deno.test("handleWebhookRequest returns challenge for GET verify", async () => {
  Deno.env.set("WHATSAPP_VERIFY_TOKEN", "verify-token");

  const req = new Request(
    "http://localhost/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=test123",
    { method: "GET" },
  );

  const res = await handleWebhookRequest(req);
  const text = await res.text();

  assertEquals(res.status, 200);
  assertEquals(text, "test123");
});
