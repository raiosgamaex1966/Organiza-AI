import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedToken = (Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "").trim();
    if (expectedToken) {
      const incomingToken = req.headers.get("asaas-access-token") || "";
      if (incomingToken !== expectedToken) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    const event = (payload.event || "").toUpperCase();
    const payment = payload.payment || {};
    const subscriptionObj = payload.subscription || {};

    const gatewaySubId = payment.subscription || subscriptionObj.id || null;
    const gatewayCustomerId = payment.customer || subscriptionObj.customer || null;
    const externalRef = payment.externalReference || subscriptionObj.externalReference || null;

    // Tenta localizar a assinatura por gateway_subscription_id ou user_id (externalReference)
    let sub: any = null;
    if (gatewaySubId) {
      const { data } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("gateway_subscription_id", gatewaySubId)
        .maybeSingle();
      sub = data;
    }

    if (!sub && externalRef) {
      const { data } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", externalRef)
        .maybeSingle();
      sub = data;
    }

    if (!sub && !externalRef) {
      return new Response(JSON.stringify({ ok: true, ignored: "no matching subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 32);

    let newStatus: string | null = null;
    let newPeriodEnd: string | undefined;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED" || event === "SUBSCRIPTION_CREATED") {
      newStatus = "active";
      newPeriodEnd = nextMonth.toISOString();
    } else if (event === "PAYMENT_OVERDUE") {
      newStatus = "overdue";
    } else if (
      event === "SUBSCRIPTION_DELETED" ||
      event === "SUBSCRIPTION_INACTIVATED" ||
      event === "PAYMENT_REFUNDED" ||
      event === "PAYMENT_CHARGEBACK_REQUESTED"
    ) {
      newStatus = "blocked";
    }

    if (newStatus) {
      const updates: Record<string, any> = {
        status: newStatus,
        gateway: "asaas",
        ...(gatewayCustomerId ? { gateway_customer_id: gatewayCustomerId } : {}),
        ...(gatewaySubId ? { gateway_subscription_id: gatewaySubId } : {}),
        ...(newPeriodEnd ? { current_period_end: newPeriodEnd } : {}),
      };

      if (sub) {
        await adminClient.from("subscriptions").update(updates).eq("id", sub.id);
      } else if (externalRef) {
        await adminClient.from("subscriptions").insert({ user_id: externalRef, ...updates });
      }
    }

    return new Response(JSON.stringify({ ok: true, event, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ASAAS-WEBHOOK] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
