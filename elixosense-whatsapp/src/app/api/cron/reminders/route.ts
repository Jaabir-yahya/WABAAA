import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("x-cron-secret");

  if (!secret || !header || header !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Placeholder for reminder sweep. In MVP we’ll drive retries via DB + cron only.
  return NextResponse.json({ ok: true });
}

