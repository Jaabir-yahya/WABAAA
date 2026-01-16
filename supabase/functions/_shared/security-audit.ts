import { getSupabaseClient } from "./db.ts";

type SecurityEvent = {
  businessId: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  actor: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

const rateLimits = new Map<string, number[]>();

export async function logSecurityEvent(event: SecurityEvent) {
  const supabase = getSupabaseClient();
  await supabase.from("security_audit_log").insert({
    business_id: event.businessId,
    event_type: event.eventType,
    severity: event.severity,
    actor: event.actor,
    action: event.action,
    resource: event.resource ?? null,
    ip_address: event.ipAddress ?? null,
    user_agent: event.userAgent ?? null,
    metadata: event.metadata ?? null,
  });
}

export async function enforceRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
  businessId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const now = Date.now();
  const windowStart = now - params.windowMs;
  const timestamps = rateLimits.get(params.key) ?? [];
  const recent = timestamps.filter((ts) => ts > windowStart);
  recent.push(now);
  rateLimits.set(params.key, recent);

  if (recent.length > params.max) {
    await logSecurityEvent({
      businessId: params.businessId,
      eventType: "rate_limit_exceeded",
      severity: "medium",
      actor: params.key,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        max: params.max,
        window_ms: params.windowMs,
      },
    });
    throw new Error("Rate limit exceeded");
  }
}
