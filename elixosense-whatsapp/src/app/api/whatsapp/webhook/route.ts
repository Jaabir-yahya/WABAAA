import crypto from "crypto";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

function verifyMetaSignatureOrThrow(rawBody: string, signatureHeader: string, appSecret: string) {
  // Meta sends: "sha256=<hex>"
  const [algo, theirHex] = signatureHeader.split("=", 2);
  if (algo !== "sha256" || !theirHex) throw new Error("invalid_signature_header");

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(theirHex, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("bad_signature");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ ok: false, error: "server_not_configured" }, { status: 500 });
  }

  if (token !== expectedToken) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // Must return the raw challenge string.
  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");
  if (appSecret) {
    if (!signature) {
      return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 401 });
    }
    try {
      verifyMetaSignatureOrThrow(rawBody, signature, appSecret);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }
  }

  // Placeholder ingest: store + workflow will be added as we implement the DB + xstate engine.
  console.log(
    JSON.stringify({
      at: "whatsapp_webhook",
      body: rawBody,
      hasSignature: Boolean(signature),
      signatureVerified: Boolean(appSecret),
    })
  );

  return NextResponse.json({ ok: true });
}

