import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return jsonResponse({ success: false, error: "Forbidden: Admin access required" }, 403);
    }

    const body = await req.json();
    const action = body._action || "dashboard";

    if (action === "dashboard") {
      const [{ data: usersData }, { data: profiles }, { data: subscriptions }, { data: plans }] =
        await Promise.all([
          adminClient.auth.admin.listUsers({ perPage: 500 }),
          adminClient.from("profiles").select("user_id, name, telefone, organization_name"),
          adminClient.from("subscriptions").select("*, plans(id, name, price_cents, billing_cycle)"),
          adminClient.from("plans").select("*").order("price_cents", { ascending: true }),
        ]);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const subMap = new Map((subscriptions || []).map((s: any) => [s.user_id, s]));

      const subscribers = (usersData?.users || []).map((u: any) => {
        const prof: any = profileMap.get(u.id) || {};
        const sub: any = subMap.get(u.id) || null;
        return {
          user_id: u.id,
          email: u.email,
          created_at: u.created_at,
          name: prof.name || u.user_metadata?.name || "Sem nome",
          telefone: prof.telefone || "",
          subscription: sub,
        };
      });

      return jsonResponse({
        success: true,
        data: {
          subscribers,
          plans: plans || [],
          asaas_webhook_url: `${supabaseUrl}/functions/v1/asaas-webhook`,
        },
      });
    }

    if (action === "update-subscription") {
      const { user_id, status, add_days, plan_id } = body;
      if (!user_id) return jsonResponse({ success: false, error: "user_id required" }, 400);

      const { data: current } = await adminClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (plan_id) updates.plan_id = plan_id;

      if (add_days && Number(add_days) > 0) {
        const base =
          current?.current_period_end && new Date(current.current_period_end) > new Date()
            ? new Date(current.current_period_end)
            : new Date();
        base.setDate(base.getDate() + Number(add_days));
        updates.current_period_end = base.toISOString();
      } else if (status === "active" && (!current?.current_period_end || new Date(current.current_period_end) < new Date())) {
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        updates.current_period_end = nextMonth.toISOString();
      }

      if (current) {
        const { error } = await adminClient
          .from("subscriptions")
          .update(updates)
          .eq("user_id", user_id);
        if (error) return jsonResponse({ success: false, error: error.message }, 500);
      } else {
        const { error } = await adminClient.from("subscriptions").insert({
          user_id,
          status: status || "active",
          gateway: "manual",
          ...updates,
        });
        if (error) return jsonResponse({ success: false, error: error.message }, 500);
      }

      return jsonResponse({ success: true });
    }

    if (action === "update-plan") {
      const { plan_id, price_cents, checkout_url, is_active } = body;
      if (!plan_id) return jsonResponse({ success: false, error: "plan_id required" }, 400);

      const updates: Record<string, any> = {};
      if (price_cents !== undefined) updates.price_cents = Number(price_cents);
      if (checkout_url !== undefined) updates.checkout_url = checkout_url.trim() || null;
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { error } = await adminClient.from("plans").update(updates).eq("id", plan_id);
      if (error) return jsonResponse({ success: false, error: error.message }, 500);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, error: "Action not found" }, 400);
  } catch (err: any) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
});
