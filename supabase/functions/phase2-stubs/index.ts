import { ensureBusinessActive, parseJson } from "../_shared/auth.ts";
import { errorResponse, HttpError, jsonResponse } from "../_shared/errors.ts";
import { enforceRateLimit } from "../_shared/security-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StubRequest = {
  business_id: string;
  action: "apply_loan" | "insurance_quote" | "settlement";
  payload?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const body = await parseJson<StubRequest>(req);
    if (!body.business_id || !body.action) {
      throw new HttpError(400, "Missing business_id or action");
    }

    await ensureBusinessActive(body.business_id);

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    await enforceRateLimit({
      key: `phase2-stubs:${body.business_id}:${ipAddress}`,
      max: 10,
      windowMs: 60_000,
      businessId: body.business_id,
      action: "phase2-stubs",
      ipAddress,
      userAgent,
    });

    switch (body.action) {
      case "apply_loan":
        return jsonResponse(
          {
            status: "phase_2_feature",
            message: "Loan applications available Q3 2026",
            required_fields: [
              "business_registration_number",
              "director_national_id",
              "6_months_bank_statements",
              "kra_pin_certificate",
            ],
            estimated_approval_time: "2-5 business days",
          },
          200,
          corsHeaders,
        );
      case "insurance_quote":
        return jsonResponse(
          {
            status: "phase_2_feature",
            message: "Insurance quotes available Q3 2026",
            potential_partners: ["Jubilee Insurance", "APA Insurance", "Britam"],
            requirements: ["product_details", "delivery_route", "customer_verification"],
          },
          200,
          corsHeaders,
        );
      case "settlement":
        return jsonResponse(
          {
            status: "phase_2_feature",
            message: "Settlements available Q3 2026",
            minimum_settlement: 1000,
            potential_partners: ["Flutterwave", "Paystack", "DusuPay"],
            settlement_frequency: ["daily", "weekly", "monthly"],
          },
          200,
          corsHeaders,
        );
      default:
        throw new HttpError(400, "Invalid action");
    }
  } catch (error) {
    return errorResponse(error);
  }
});
