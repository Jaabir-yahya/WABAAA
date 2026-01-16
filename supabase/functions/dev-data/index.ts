import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (Deno.env.get("ENVIRONMENT") === "production") {
    return new Response("Not available in production", { status: 403 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase configuration", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", "dev-test")
    .order("created_at", { ascending: false });

  if (ordersError) {
    return new Response(ordersError.message, { status: 500 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("commerce_events")
    .select("*")
    .eq("business_id", "dev-test")
    .eq("event_type", "whatsapp_message_in")
    .order("created_at", { ascending: false });

  if (messagesError) {
    return new Response(messagesError.message, { status: 500 });
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("business_id", "dev-test")
    .order("created_at", { ascending: false });

  if (paymentsError) {
    return new Response(paymentsError.message, { status: 500 });
  }

  return new Response(JSON.stringify({ orders, messages, payments }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
