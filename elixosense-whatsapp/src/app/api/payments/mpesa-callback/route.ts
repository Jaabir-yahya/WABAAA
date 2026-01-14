import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Safaricom will retry callbacks; when we implement persistence we must make this idempotent.
  const bodyText = await request.text();
  console.log(
    JSON.stringify({
      at: "mpesa_callback",
      body: bodyText,
    })
  );

  // Daraja expects a 200 to acknowledge receipt.
  return NextResponse.json({ ok: true });
}

